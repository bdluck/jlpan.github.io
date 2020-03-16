from wsgiref.simple_server import make_server
import os
from threading import Thread
 
def async_call(fn):
    def wrapper(*args, **kwargs):
        Thread(target=fn, args=args, kwargs=kwargs).start()
    return wrapper

@async_call
def npm():
    os.system('sh deploy.sh')
    return

def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/html')])
    npm()
    return ['success']
httpd = make_server('', 8090, application)
httpd.serve_forever()

#  nohup python -u hock.py > py.log 2>&1 &

