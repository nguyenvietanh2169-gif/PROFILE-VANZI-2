import sys
from PIL import Image

def make_transparent(image_path, output_path):
    print(f"Processing {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If R, G, B are all very close to white (background is 255, 255, 255)
        if r > 248 and g > 248 and b > 248:
            new_data.append((255, 255, 255, 0)) # Fully transparent
        elif r > 235 and g > 235 and b > 235:
            # Smooth transition on the edges to prevent jaggy white borders
            avg = (r + g + b) / 3.0
            alpha = int((248 - avg) / 13.0 * 255)
            alpha = max(0, min(255, alpha))
            new_data.append((r, g, b, alpha))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

if __name__ == "__main__":
    make_transparent(
        "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/src/assets/human.png",
        "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/temp_human.png"
    )
    make_transparent(
        "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/src/assets/robot.png",
        "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/temp_robot.png"
    )
    
    # Overwrite the original assets
    import os
    os.replace("/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/temp_human.png", "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/src/assets/human.png")
    os.replace("/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/temp_robot.png", "/Users/nguyenvietanh/Documents/antigravity/delightful-goodall/src/assets/robot.png")
    print("Successfully replaced original assets with transparent PNGs.")
