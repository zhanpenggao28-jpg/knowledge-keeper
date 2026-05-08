def ocr_image(image_path: str) -> str:
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(lang='ch')
        result = ocr.ocr(image_path, cls=False)
        if not result or not result[0]:
            return ''
        texts = [line[1][0] for line in result[0] if line and len(line) > 1]
        return '\n'.join(texts)
    except ImportError:
        return ''
    except Exception as e:
        return ''


def ocr_pdf(file_path: str) -> str:
    """将 PDF 逐页转图片后 OCR"""
    try:
        from pdf2image import convert_from_path
        from paddleocr import PaddleOCR
        import os

        ocr = PaddleOCR(lang='ch')
        images = convert_from_path(file_path, dpi=200)
        texts = []
        for i, img in enumerate(images):
            tmp_path = f"{file_path}.page_{i}.png"
            img.save(tmp_path, 'PNG')
            result = ocr.ocr(tmp_path, cls=False)
            if result and result[0]:
                page_text = '\n'.join(line[1][0] for line in result[0] if line and len(line) > 1)
                texts.append(page_text)
            os.remove(tmp_path)
        return '\n'.join(texts)
    except ImportError:
        return ''
    except Exception as e:
        return ''
