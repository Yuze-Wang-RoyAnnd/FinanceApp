import pandas as pd
class stock_list:
    def __init__(self) -> None:
        self.ticker_list = pd.read_csv('us_symbols.csv', delimiter=',')

    #get stock list, limit number of shown
    def get_symbol_List(self, current, max=10):
        frames = []
        frames.append(self.ticker_list.loc[self.ticker_list['ticker'].str.contains(current, na=False, case=False)]) #search for tickers
        frames.append(self.ticker_list.loc[self.ticker_list['name'].str.contains(current, na=False, case=False)]) #search for names
        final_frames = pd.concat(frames).drop_duplicates()
        maxShow = max if final_frames.size > max else final_frames.size
        return final_frames[:maxShow].reset_index().to_json(orient='records')