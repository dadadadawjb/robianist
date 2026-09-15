import pypdfium2 as pdf
from PIL import Image
p=pdf.PdfDocument(r'E:/Learnings/MusicLearning/Piano/可惜没如果钢琴谱.pdf')
ims=[]
for page in p:
 im=page.render(scale=4).to_pil().convert('RGB').getchannel('R').point(lambda x:0 if x<145 else 255).convert('1');ims.append(im)
ims[0].save('tmp/pdfs/clean-score.tif',save_all=True,append_images=ims[1:],compression='tiff_lzw',dpi=(288,288))
