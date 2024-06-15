import psycopg2

def connect():
    conn = psycopg2.connect(
        #host = os.environ['HOST'],
        #database = os.environ['DB_NAME'],
        #user = os.environ['USER_NAME'],
        #password = os.environ['PASSWORD'])
        host = "gusydenis.duckdns.org",
        database = "sharepc",
        user = "batman",
        password = "soybruce")
        
    return conn