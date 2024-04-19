from yahoofinancials import YahooFinancials
from datetime import datetime
from dateutil.relativedelta import relativedelta
import pandas_market_calendars as mcal
from util import yearsago
import requests
import json

class Ticker:
    def __init__(self, name) -> None:
        '''
        initalize the Yahofinanical class to process certain ticker
        Information can be store and processd latter. 
        '''
        self.ticker_name = name
        self.ticker = YahooFinancials(self.ticker_name, max_workers=5, country="US")

    def get_general_info(self):
        mktcap = self.ticker.get_market_cap()
        avgVol = self.ticker.get_ten_day_avg_daily_volume()
        eps = self.ticker.get_earnings_per_share()
        dividend = self.ticker.get_dividend_rate()
        currentPrice = self.ticker.get_current_price()

        return {
            'mktcap': '--' if mktcap == None else '{0:.1f}'.format(mktcap/10000000) + 'MM',
            'avgVol': '--' if avgVol == None else'{:,}'.format(avgVol),
            'eps' : '--' if eps == None else'{0:.3f}'.format(eps),
            'dividend': '--' if dividend == None else'{0:.3f}'.format(dividend),
            'currentPrice' : currentPrice
        }
    
    def get_price_info(self, date=yearsago(3)):
        '''
        return raw price data as an array
        '''

        today = datetime.today().date().strftime('%Y-%m-%d')
        if (today == date) :
            return []
        nyse = mcal.get_calendar('NYSE')
        print(date, today)
        if (nyse.schedule(start_date=date, end_date=today).empty):
            return []
        info = self.ticker.get_historical_price_data(date, today, 'daily')[self.ticker_name]['prices']
        return list(map(lambda x: {'adjclose': x['adjclose'], 'date': x['formatted_date']}, info))
    
    def get_financial_balance(self):
        stmts = self.ticker.get_financial_stmts('annual', 'balance')
        output = []
        for records in stmts['balanceSheetHistory'][self.ticker_name]:
            keys, values = zip(*records.items())
            output.append(
                {
                    'fiscalDateEnding' : keys[0][:4],
                    'totalLiabilities' : values[0]['totalLiabilitiesNetMinorityInterest'] if 'totalLiabilitiesNetMinorityInterest' in values[0].keys() else '0',
                    'totalEquity' : values[0]['totalEquityGrossMinorityInterest'] if 'totalEquityGrossMinorityInterest' in values[0].keys() else '0',
                    'currentAssets' : values[0]['currentAssets'] if 'currentAssets' in values[0].keys() else '0',
                    'currentLiabilities' : values[0]['currentLiabilities'] if 'currentLiabilities' in values[0].keys() else '0',
                    'cash' : values[0]['cashCashEquivalentsAndShortTermInvestments'] if 'cashCashEquivalentsAndShortTermInvestments' in values[0].keys() else '0',
                    'long_debt' : values[0]['longTermDebtAndCapitalLeaseObligation'] if 'longTermDebtAndCapitalLeaseObligation' in values[0].keys() else '0',
                }
            )
        output.sort(key= lambda x: x['fiscalDateEnding'], reverse=False)
        return output
    
    def get_financial_cash(self):

        stmts = self.ticker.get_financial_stmts('annual', 'cash')
        output = []
        for records in stmts['cashflowStatementHistory'][self.ticker_name]:
            keys, values = zip(*records.items())
            output.append(
                {
                    'fiscalDateEnding' : keys[0][:4],
                    'operatingCashflow' : values[0]['operatingCashFlow'] if 'operatingCashFlow' in values[0].keys() else '0',
                    'investingCashFlow' : values[0]['investingCashFlow'] if 'investingCashFlow' in values[0].keys() else '0',
                    'financingCashFlow' : values[0]['financingCashFlow'] if 'financingCashFlow' in values[0].keys() else '0',
                }
        )
        output.sort(key= lambda x: x['fiscalDateEnding'], reverse=False)
        return output

    def get_financial_income(self):
        stmts = self.ticker.get_financial_stmts('annual', 'income')
        output = []

        for records in stmts['incomeStatementHistory'][self.ticker_name]:
            keys, values = zip(*records.items())
            output.append(
                {
                    'fiscalDateEnding' : keys[0][:4],
                    'totalRevenue' : values[0]['totalRevenue'] if 'totalRevenue' in values[0].keys() else '0',
                    'costOfRevenue' : values[0]['costOfRevenue'] if 'costOfRevenue' in values[0].keys() else '0',
                    'EBIT' : values[0]['ebit'] if 'ebit' in values[0].keys() else '0',
                    'netIncome' : values[0]['netIncomeFromContinuingOperationNetMinorityInterest'] if 'netIncomeFromContinuingOperationNetMinorityInterest' in values[0].keys() else '0',
                }
            )
        output.sort(key= lambda x: x['fiscalDateEnding'], reverse=False)
        return output

    def dump_json(self):
        return {
            'last_update' : datetime.today().date().strftime('%Y-%m-%d'),
            'generalInfo' : self.get_general_info(), 
            'priceInfo' : self.get_price_info(date=yearsago(3).strftime('%Y-%m-%d')),
            'balance_position' : self.get_financial_balance(),
            'cash_flow' : self.get_financial_cash(),
            'income_statment' : self.get_financial_income(),
        }

    

@staticmethod
def get_percentage_info_from_date(priceJson, time):
    # 1W, 1m, 3m, 1y, 3y, 
    delta_time = [relativedelta(weeks=-1), relativedelta(months=-1), relativedelta(months=-3), relativedelta(months=-6),\
                relativedelta(years=-1), relativedelta(years=-3)]
    delta_int = [7, 30, 90, 365, 1068] #reduce compute time
    lastdate = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0) + delta_time[time]
    if time == 5:
        inital = priceJson[0]['adjclose']
        #calculate percetnage change
        return list(map(lambda x: {'adj-percentage': ((x['adjclose'] - inital) /inital)*100,  'date': x['date']}, priceJson))
    else:
        rough_estimate = priceJson[-delta_int[time]:]
        #start from last
        true_loc = 0
        for i in range(len(rough_estimate)):
            if datetime.strptime(rough_estimate[i]['date'], "%Y-%m-%d") >= lastdate:
                true_loc = i
                break
        inital = rough_estimate[true_loc:][0]['adjclose']
        return list(map(lambda x: {'adj-percentage': ((x['adjclose'] - inital) /inital)*100,  'date': x['date']}, rough_estimate[true_loc:]))

@staticmethod
def get_market_calendar(nyse, time):
    delta_time = [relativedelta(weeks=-1), relativedelta(months=-1), relativedelta(months=-3), relativedelta(months=-6),\
                relativedelta(years=-1), relativedelta(years=-3)]
    lastdate = datetime.today().replace(minute=0, second=0, microsecond=0) + delta_time[time]

    selected_schedule = nyse.schedule(start_date=lastdate.strftime('%Y-%m-%d'), end_date=datetime.today().strftime('%Y-%m-%d'))
    timeIndex = mcal.date_range(selected_schedule, frequency='1D') #pandas datetime index
    return list(timeIndex.strftime('%Y-%m-%d'))


if __name__ == '__main__':
    tik = Ticker('AMZN')
    print(tik.get_price_info('2024-01-26'))
