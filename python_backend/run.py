"""PyInstaller entry point — starts uvicorn programmatically."""
import uvicorn

if __name__ == '__main__':
    uvicorn.run(
        'main:app',
        host='127.0.0.1',
        port=0,          # OS picks a free port; uvicorn prints it to stderr
        log_level='info'
    )
