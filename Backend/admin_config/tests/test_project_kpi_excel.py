from datetime import date

from django.test import SimpleTestCase

from admin_config.services.project_kpi_excel_service import (
    create_project_kpi_workbook,
)


class ProjectKpiExcelTests(SimpleTestCase):
    def test_workbook_keeps_expected_single_sheet_layout(self):
        workbook = create_project_kpi_workbook(
            "ProjetY",
            [
                {
                    "name": "TES-X",
                    "totalSteps": 34,
                    "validatedSteps": 9,
                    "okSteps": 8,
                    "nokSteps": 0,
                    "minorSteps": 1,
                    "nonCoteSteps": 0,
                    "aCoterSteps": 25,
                    "okPercent": 23.5,
                    "nokPercent": 0,
                    "minorPercent": 2.9,
                    "nonCotePercent": 0,
                    "aCoterPercent": 73.5,
                    "evStats": [
                        {
                            "evCode": "EV-1",
                            "total": 3,
                            "ok": 2,
                            "nok": 0,
                            "minor": 1,
                            "nonCote": 0,
                            "aCoter": 0,
                        }
                    ],
                    "startDate": date(2026, 6, 15),
                    "endDate": date(2026, 6, 21),
                    "durationDays": 7,
                }
            ],
        )

        self.assertEqual(workbook.sheetnames, ["KPI Projet"])
        worksheet = workbook["KPI Projet"]
        self.assertEqual(worksheet["A1"].value, "KPI Projet - ProjetY")
        self.assertEqual(
            worksheet["A4"].value,
            "Resultat EV global du projet - ProjetY",
        )
        self.assertEqual(
            worksheet["J4"].value,
            "Cotations globales du projet - ProjetY",
        )
        self.assertEqual(worksheet["A12"].value, "KPI par EV")
        self.assertEqual(worksheet["F12"].value, "KPI par gamme")
        self.assertEqual(worksheet["A14"].value, "TES-X\n(34)")
        self.assertIn("E14:E17", {str(item) for item in worksheet.merged_cells})
        self.assertIn("I14:I18", {str(item) for item in worksheet.merged_cells})

