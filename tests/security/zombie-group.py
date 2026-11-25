import os, sys, time
pid = os.fork()
if pid == 0:
    os.setsid()
    os._exit(0)
time.sleep(0.3)
print(pid, flush=True)
sys.stdin.readline()
os.waitpid(pid, 0)
print("reaped", flush=True)
