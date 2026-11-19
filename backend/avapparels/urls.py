from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

admin.site.site_header = "AV Apparels Admin"
admin.site.site_title = "AV Apparels Admin"
admin.site.index_title = "Store management"


def health(_request):
    return JsonResponse({"status": "ok", "service": "av-apparels-api"})


urlpatterns = [
    path("", health),
    path("admin/", admin.site.urls),
    path("api/", include("shop.urls")),
]

# On PythonAnywhere, map /media/ and /static/ in the Web tab instead.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
