import Vision
import CoreImage
import Foundation
import os

def detect_faces(image_path):
    url = Foundation.NSURL.fileURLWithPath_(image_path)
    image = CoreImage.CIImage.imageWithContentsOfURL_(url)
    if not image: return 0
    
    request = Vision.VNDetectFaceRectanglesRequest.alloc().init()
    handler = Vision.VNImageRequestHandler.alloc().initWithCIImage_options_(image, None)
    
    try:
        handler.performRequests_error_([request], None)
        results = request.results()
        if results:
            return len(results)
    except:
        pass
    return 0

directory = "/Users/matty/SchmidtWalls/images"
for filename in os.listdir(directory):
    if filename.endswith(".jpg"):
        path = os.path.join(directory, filename)
        count = detect_faces(path)
        if count > 0:
            print(f"{filename}: {count} faces")
