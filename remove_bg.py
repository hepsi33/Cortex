from PIL import Image
def convert_to_transparent():
    img = Image.open(r'd:\projects\Cortex\public\login_logo.png').convert('RGBA')
    data = img.getdata()
    new_data = []
    for r, g, b, a in data:
        luminance = max(r, g, b)
        if luminance == 0:
            new_data.append((0, 0, 0, 0))
        else:
            new_a = luminance
            new_r = min(255, int((r * 255) / new_a))
            new_g = min(255, int((g * 255) / new_a))
            new_b = min(255, int((b * 255) / new_a))
            new_data.append((new_r, new_g, new_b, new_a))
    img.putdata(new_data)
    img.save(r'd:\projects\Cortex\public\login_logo.png')

convert_to_transparent()
