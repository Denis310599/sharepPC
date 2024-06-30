import psycopg2

def connect():
    conn = psycopg2.connect(
        #host = os.environ['HOST'],
        #database = os.environ['DB_NAME'],
        #user = os.environ['USER_NAME'],
        #password = os.environ['PASSWORD'])
        host = "172.17.0.1",
        database = "sharepc",
        user = "batman",
        password = "soybruce")
        
    return conn