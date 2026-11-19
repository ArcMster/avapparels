# Paste this into the WSGI file linked from your PythonAnywhere Web tab,
# replacing everything already there. Change YOUR_USERNAME.
import os
import sys

path = "/home/YOUR_USERNAME/av-apparels/backend"
if path not in sys.path:
    sys.path.insert(0, path)

os.environ["DJANGO_SETTINGS_MODULE"] = "avapparels.settings"

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
