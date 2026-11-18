from pathlib import Path

import pymupdf


source = Path(r"C:\Users\LAPTOP CENTER\Documents\BLUETOOTH\ELEGANT STYLE ACADEMY PIND 2.pdf")
destination = Path("output/pdf/Elegant_Style_Academy_YEP_Curriculum.pdf")
destination.parent.mkdir(parents=True, exist_ok=True)

document = pymupdf.open(source)
# The source is a scan. These are the eight SUPA heading lines, in PDF points.
heading_y = {0: 70, 2: 92, 4: 49, 5: 67, 6: 301, 8: 49, 9: 239, 11: 49}
heading = "CURRICULUM FOR YOUTH EMPOWERMENT PROGRAM (YEP)"

for index, center_y in heading_y.items():
    page = document[index]
    cover = pymupdf.Rect(185, center_y - 11, 607, center_y + 11)
    page.draw_rect(cover, color=None, fill=(1, 1, 1), overlay=True)
    remaining = page.insert_textbox(
        cover,
        heading,
        fontname="hebo",
        fontsize=10,
        align=pymupdf.TEXT_ALIGN_CENTER,
        color=(0, 0, 0),
        overlay=True,
    )
    if remaining < 0:
        raise RuntimeError(f"Heading did not fit on page {index + 1}")

document.save(destination, garbage=4, deflate=True)
print(destination.resolve())
