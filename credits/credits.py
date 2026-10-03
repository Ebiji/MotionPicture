from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS,N=1920,1076,24,121
jp=ImageFont.truetype("NotoSerifJP.otf",25)
en=ImageFont.truetype("Cormorant.ttf",38); en.set_variation_by_name("SemiBold")
lines=[("動画生成","KLING,  GEMINI"),("画像生成","Chat GPT"),
       ("音楽生成","SUNO,  Chat GPT"),("動画編集","Canva,  Claude Code,  KOTONOHA")]
CX,GAP,LH=960,30,52

def spaced(d,xy,t,f,fill,tr,anchor_right=False):
    w=sum(d.textlength(c,font=f) for c in t)+tr*(len(t)-1)
    x,y=xy
    if anchor_right: x-=w
    for c in t:
        d.text((x,y),c,font=f,fill=fill,anchor="ls"); x+=d.textlength(c,font=f)+tr

def block():
    """Render the static credit block (text + soft shadow) once, per line."""
    out=[]
    for role,name in lines:
        txt=Image.new("RGBA",(W,LH+40),(0,0,0,0)); d=ImageDraw.Draw(txt)
        base=LH
        spaced(d,(CX-GAP,base-3),role,jp,(226,214,190,255),6,True)
        spaced(d,(CX+GAP,base),name,en,(255,255,255,255),2.5)
        d.line([(CX,base-26),(CX,base+2)],fill=(226,214,190,150),width=1)
        sh=Image.new("RGBA",txt.size,(0,0,0,0)); sh.putalpha(txt.getchannel("A").point(lambda a:a*0.85))
        sh=sh.filter(ImageFilter.GaussianBlur(5))
        comp=Image.alpha_composite(sh,txt); out.append(comp)
    return out
L=block()
# bottom gradient for legibility
grad=Image.new("RGBA",(W,H),(0,0,0,0)); g=ImageDraw.Draw(grad)
GH=360
for i in range(GH):
    a=int(150*(i/GH)**1.6); g.line([(0,H-GH+i),(W,H-GH+i)],fill=(8,6,4,a))
ease=lambda x:0 if x<=0 else 1 if x>=1 else 1-(1-x)**3
for f in range(N):
    t=f/FPS
    fr=Image.new("RGBA",(W,H),(0,0,0,0))
    ga=ease(t/0.8)
    gg=grad.copy(); gg.putalpha(grad.getchannel("A").point(lambda a:int(a*ga)))
    fr=Image.alpha_composite(fr,gg)
    top=H-60-len(lines)*LH - 28 + 28*(1-t/5.04)   # slow staff-roll drift upward
    for i,img in enumerate(L):
        p=ease((t-0.35-0.32*i)/0.7)
        if p<=0: continue
        a=img.copy(); a.putalpha(img.getchannel("A").point(lambda v:int(v*p)))
        y=int(top+i*LH+14*(1-p)) - 40 + 12
        fr.alpha_composite(a,(0,y))
    fr.save(f"ov/{f:04d}.png")
