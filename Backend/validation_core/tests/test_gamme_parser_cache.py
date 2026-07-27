import os
import tempfile
from unittest.mock import patch

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings

from validation_core.services.gamme_parser import parse_gamme_cached


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "gamme-parser-tests",
        }
    }
)
class GammeParserCacheTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    @patch("validation_core.services.gamme_parser.parse_gamme")
    def test_cached_parser_parses_each_file_version_once(self, parse_mock):
        parse_mock.return_value = {"colonnes": [], "blocs": []}

        with tempfile.NamedTemporaryFile(delete=False) as workbook:
            workbook.write(b"version-one")
            file_path = workbook.name

        try:
            first = parse_gamme_cached(file_path)
            second = parse_gamme_cached(file_path)

            self.assertEqual(first, second)
            self.assertEqual(parse_mock.call_count, 1)

            with open(file_path, "ab") as workbook:
                workbook.write(b"-version-two")
            os.utime(file_path, None)

            parse_gamme_cached(file_path)
            self.assertEqual(parse_mock.call_count, 2)
        finally:
            os.unlink(file_path)

