from flask import Flask, request, make_response 
from load_symbols import stock_list
from fetch_info import Ticker, get_percentage_info_from_date, get_market_calendar
import pandas_market_calendars as mcal
from datetime import datetime
import redis
from flask_cors import CORS, cross_origin
from util import connectDB
import configparser

app = Flask(__name__)
CORS(app)

#helper classes
my_stock_symbols = stock_list()
nyse = mcal.get_calendar('NYSE')
config = configparser.RawConfigParser()
config.read('config.cfg')
host_detail = dict(config.items('Backend Config'))


#API route
#Mutative Operation
################################POST TO DB###############################
@app.route('/api/remove_accessor', methods=['PUT'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def remove_accessor(db_endpoint):
    ticker = request.json['ticker']
    if db_endpoint.exists(ticker):
        response = db_endpoint.json().numincrby(ticker, '$.accessor', -1)
        if response == 'nil':
            return make_response({'response' : 'remove accessor failed'}, 500)    
    return make_response({'response' : 'sucess'}, 200)

@app.route('/api/update_accessor', methods=['PUT'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def update_accessor(db_endpoint):
    ticker = request.json['ticker']
    if db_endpoint.exists(ticker):
        response =  db_endpoint.json().numincrby(ticker, '$.accessor', 1)
        if response == 'nil':
            return make_response({'response' : 'update accessor failed'}, 500) 
    return make_response({'response' : 'sucess'}, 200)

@app.route('/api/prepare', methods=['POST'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def prepare(db_endpoint):
    #populate this ticker with info for process
    ticker = request.json['ticker']
    with db_endpoint.pipeline(transaction=True) as pipeline: #create a redis pipeline ensure atomic operation
        while True:
            try:
                pipeline.watch(ticker) #Watches for key change
                if pipeline.exists(ticker): #If there is a key in the db
                    response = db_endpoint.json().get(ticker, '$.last_update') #check for update time

                    if datetime.strptime(response[0], '%Y-%m-%d').date() != datetime.today().date():
                        this_ticker_obj = Ticker(ticker)
                        price_diff = this_ticker_obj.get_price_info(date=response[0])
                        if len(price_diff) != 0:
                            pipeline.multi()
                            pipeline.json().arrappend(ticker, '$.priceInfo', price_diff)
                            pipeline.json().arrtrim(ticker, '$.priceInfo', start=len(price_diff), stop=0)
                            
                            pipeline.json().set(ticker, '$.last_update', datetime.today().date().strftime('%Y-%m-%d'))
                            pipeline.json().set(ticker, '$.generalInfo', this_ticker_obj.get_general_info())
                            db_response = pipeline.execute()
                            pipeline.reset()
                        if ['nil'] in response:
                            #whipe this table
                            db_endpoint.json().delete(ticker)
                            pipeline.reset()
                            print(f'{ticker} prepartion failed')
                            return make_response({'response' : 'DB failed'}, 500)
                        else:
                            print(f'{ticker} is ready for use')
                            return make_response({'response' : 'success'}, 201)
                    else:
                        print(f'{ticker} is ready for use')
                        return make_response({'response' : 'success'}, 201)
                else: #If there isn't a key in db
                    pipeline.multi()
                    this_ticker_obj = Ticker(ticker)
                    post_data = this_ticker_obj.dump_json()
                    post_data['accessor'] = 0
                    pipeline.json().set(ticker, '$', post_data)
                    db_response = pipeline.execute()
                    print(db_response)
                    if db_response == 'nil':
                        return make_response({'response' : 'creation failed'}, 500)
                    print(f'{ticker} is ready for use')
                    return make_response({'response' : 'success'}, 201)
            except redis.WatchError: #if key change occure, restart operation
                continue



###############################Clean DB#################################
@app.route('/api/selfClean', methods=['DELETE'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def clean(db_endpoint):
    tickers = request.json['ticker']
    #Remove one accessor for that particular Key
    with db_endpoint.pipeline(transaction=True) as pipeline:
        while True:
            try:
                pipeline.watch(*tickers)
                pipeline.multi()
                for tick in tickers:
                    pipeline.json().numincrby(tick, '$.accessor', -1)
                pipeline.execute()
                pipeline.reset()
                break
            except redis.WatchError:
                continue

    #if there is no accessor for that particular Key, delcare dead key and remove from db
    for key in db_endpoint.scan_iter():
        with db_endpoint.pipeline(transaction=True) as pipeline:
            try:
                accessor_size = db_endpoint.json().get(key, '$.accessor')[0]
                if accessor_size == 0:
                    pipeline.watch(key)
                    print('delete ', key)
                    pipeline.delete(key)
                    pipeline.reset()
                    continue
            except redis.WatchError:
                continue
        pipeline.reset()
    return make_response('', 204)



#None Mutative Operation
################################GET RESPONSE###############################

@app.route('/api/get_company_list', methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
def get_company_list():
    input_msg = request.args['input_msg']
    return make_response(my_stock_symbols.get_symbol_List(input_msg), 200)


@app.route('/api/get_info', methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def get_info(db_endpoint):
    ticker = request.args['ticker']
    fetch_info = db_endpoint.json().get(ticker, '$.generalInfo')
    if fetch_info == None:
        return make_response({'response': 'fetch request failed'}, 500)
    return make_response(fetch_info[0], 200)

@app.route('/api/get_balance',  methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def get_balance(db_endpoint):
    tickers = request.args.getlist('ticker')
    dataBody = []
    years = set()
    for ticker in tickers:
        data = db_endpoint.json().get(ticker, '$.balance_position')[0]
        if data == None:
            return make_response({'response' : f'fetch request failed, unable to fetch {ticker} balance from DB'}, 500)
        #process fiscal year
        dataBody.append({ticker: data})
        years = years.union(set([d['fiscalDateEnding']for d in data]))
    return make_response({
        'date' : sorted(list(years), reverse=False),
        'balance_data' : dataBody
    }, 200)

@app.route('/api/get_cash', methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def get_cash(db_endpoint):
    tickers = request.args.getlist('ticker')
    dataBody = []
    years = set()
    for ticker in tickers:
        data = db_endpoint.json().get(ticker, '$.cash_flow')[0]
        if data == None:
            return make_response({'response' : f'fetch request failed, unable to fetch {ticker} cash flow from DB'}, 500)
        dataBody.append({ticker: data})
        years = years.union(set([d['fiscalDateEnding']for d in data]))
    return make_response({
        'date' : sorted(list(years), reverse=False),
        'cash_data' : dataBody
    }, 200)

@app.route('/api/get_income', methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def get_income(db_endpoint):
    tickers = request.args.getlist('ticker')
    dataBody = []
    years = set()
    for ticker in tickers:
        data = db_endpoint.json().get(ticker, '$.income_statment')[0]
        if data == None:
            return make_response({'response' : f'fetch request failed, unable to fetch {ticker} income from DB'}, 500)
        dataBody.append({ticker: data})
        years = years.union(set([d['fiscalDateEnding']for d in data]))
    return make_response({
        'date' : sorted(list(years), reverse=False),
        'income_data' : dataBody
    }, 200)


@app.route('/api/get_price',  methods=['GET'])
@cross_origin(origins=host_detail['allowed_address'])
@connectDB
def get_price(db_endpoint):
    tickers = request.args.getlist('ticker')
    time = request.args['time']
    #market calandar date 
    min_ = 0
    max_ = 0
    dataBody = []
    for ticker in tickers:
        db_response = db_endpoint.json().get(ticker, '$.priceInfo')[0]
        if db_response == None:
            return make_response({'response' : f'fetch request failed, unable to fetch {ticker} price information from DB'}, 500)
        data = get_percentage_info_from_date(db_endpoint.json().get(ticker, '$.priceInfo')[0], int(time))
        tmp_min_, tmp_max_ = min([d['adj-percentage'] for d in data]), max([d['adj-percentage'] for d in data])
        min_ = min_ if min_ < tmp_min_ else tmp_min_
        max_ = max_ if max_ > tmp_max_ else tmp_max_
        dataBody.append({ticker : {'data' : data}})

    calendar = get_market_calendar(nyse, int(time))
    return make_response({
        'batch-MinMax' : {'min' : min_, 'max' : max_},
        'mkt-calendar': calendar,
        'mkt-data': dataBody
    }, 200)

@app.route('/')
def index():
    return ('This is the backend for finance app created by @Yuze-Wang-RoyAnnd')


if __name__ == "__main__":
    app.run(host=host_detail['host_address'], port=host_detail['host_port'])