from PIL import Image, ImageDraw, ImageFont
import os

# 创建logo目录
logo_dir = 'f:\\pypoj\\插件市场\\mk\\k4u\\uploads'
if not os.path.exists(logo_dir):
    os.makedirs(logo_dir)

# 创建32x32的logo图片
img = Image.new('RGBA', (32, 32), (255, 255, 255, 0))
draw = ImageDraw.Draw(img)

# 绘制背景
draw.rectangle([0, 0, 32, 32], fill=(156, 39, 176))  # 紫色背景

# 添加文字
try:
    font = ImageFont.truetype('arial.ttf', 16)
except:
    font = ImageFont.load_default()

draw.text((4, 6), 'K4U', fill=(255, 255, 255), font=font)

# 保存logo
img.save(os.path.join(logo_dir, 'k4u.png'))

# 创建加载动画图片（简单版本）
loader_img = Image.new('RGBA', (64, 64), (255, 255, 255, 0))
draw = ImageDraw.Draw(loader_img)
draw.rectangle([0, 0, 64, 64], fill=(156, 39, 176))
draw.text((12, 22), 'K4U', fill=(255, 255, 255), font=ImageFont.load_default())
loader_img.save(os.path.join(logo_dir, 'k4u.gif'))

print("K4U logo created successfully!")