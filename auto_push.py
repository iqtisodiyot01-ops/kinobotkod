import subprocess
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

INTERVAL = 3600  # har 1 soatda

logging.info("Auto-push ishga tushdi. Har %d soniyada GitHub'ga push qilinadi.", INTERVAL)

while True:
    try:
        result = subprocess.run(
            ["bash", "/home/runner/workspace/kinokodbot/git_push.sh"],
            capture_output=True, text=True, timeout=120
        )
        output = result.stdout.strip()
        if output:
            logging.info("Push natijasi:\n%s", output)
        if result.returncode != 0 and result.stderr:
            logging.warning("Xato: %s", result.stderr[:300])
    except Exception as e:
        logging.error("Push xatosi: %s", e)

    time.sleep(INTERVAL)
