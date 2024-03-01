from datetime import datetime
import redis

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
            host='Host',
            port=14592,
            password='pass'
        )
        msg = f(db_endpoint)
        db_endpoint.close()
        return msg
    wrapper.__name__ = f.__name__
    return wrapper
    
    
