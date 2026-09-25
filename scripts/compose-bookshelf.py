# Composites the seven covers onto bare spots of src/media/bookshelf/case-source.png at true shelf scale
# and writes case.jpg/webp (+1024 variants) and src/_data/bookshelfImage.json hotspots.
# Re-run after replacing case-source.png with the licensed, watermark-free file: python3 scripts/compose-bookshelf.py
from PIL import Image, ImageFilter, ImageDraw
import json
bg=Image.open('src/media/bookshelf/case-source.png').convert('RGBA'); W,H=bg.size
# (slug, plank top y = book bottom, centre x, compartment top y) — measured on the 1372x768 source
place=[('365-days-of-grace',129,925,68),('finding-drakes-feather',129,1120,68),('finding-your-self-worth',197,690,129),('rooted-in-purpose',267,925,197),
       ('the-price-of-choosing-you',267,405,197),('the-price-of-letting-go',267,441,197),('what-we-keep',267,477,197)]
books={b['slug']:b for b in json.load(open('src/_data/books.json'))}
hot=[]; out=bg.copy()
for slug,py,cx,ty in place:
    cov=Image.open(f'src/media/covers/{slug}-cover.jpg').convert('RGBA')
    h=int((py-ty)*0.88); w=int(h*cov.width/cov.height); c=cov.resize((w,h),Image.LANCZOS)
    shade=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(shade)
    for i in range(max(2,w//10)): d.line([(i,0),(i,h)],fill=(0,0,0,int(90*(1-i/(w/10)))))
    c=Image.alpha_composite(c,shade); x0=cx-w//2; y0=py-2-h
    sh=Image.new('RGBA',(w+30,h+30),(0,0,0,0)); ImageDraw.Draw(sh).rectangle([12,14,12+w,14+h],fill=(0,0,0,150)); sh=sh.filter(ImageFilter.GaussianBlur(6))
    out.alpha_composite(sh,(x0-16,y0-10)); out.alpha_composite(c,(x0,y0))
    hot.append({'slug':slug,'title':books[slug]['title'],'left':round(100*(x0-6)/W,2),'top':round(100*(y0-6)/H,2),'width':round(100*(w+12)/W,2),'height':round(100*(h+12)/H,2)})
rgb=out.convert('RGB')
rgb.save('src/media/bookshelf/case.jpg',quality=88,optimize=True,progressive=True); rgb.save('src/media/bookshelf/case.webp',quality=84,method=6)
small=rgb.resize((1024,round(H*1024/W)),Image.LANCZOS); small.save('src/media/bookshelf/case-1024.jpg',quality=86,optimize=True); small.save('src/media/bookshelf/case-1024.webp',quality=82,method=6)
json.dump({'width':W,'height':H,'hotspots':hot},open('src/_data/bookshelfImage.json','w'),indent=2)
print('bookshelf composed', W, H)
