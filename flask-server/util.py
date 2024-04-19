from datetime import datetime
import redis
import configparser


config = configparser.RawConfigParser()
config.read('config.cfg')
db_detail = dict(config.items('db Config'))

@staticmethod
def yearsago(years):
    from_date = datetime.now()
    try:
        return from_date.replace(year=from_date.year - years)
    except ValueError:
        # Must be 2/29!
        assert from_date.month == 2 and from_date.day == 29 # can be removed
        return from_date.replace(month=2, day=28,
                                year=from_date.year-years)


def connectDB(f):
    def wrapper():
        db_endpoint = redis.Redis(
            host= db_detail['db_host'],
            port= db_detail['db_port'],
            password= db_detail['db_pass']
        )
        msg = f(db_endpoint)
        db_endpoint.close()
        return msg
    wrapper.__name__ = f.__name__
    return wrapper
    
    
