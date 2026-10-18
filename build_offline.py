from __future__ import annotations
import base64
import concurrent.futures
import hashlib
import json
import re
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'src'
OUTPUT=ROOT.parent/'offline'
CACHE=ROOT/'.font-cache'
OLD_CACHE=OUTPUT/'.font-cache'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

def fetch(url):
    key=hashlib.sha256(url.encode()).hexdigest()
    for base in [CACHE,OLD_CACHE]:
        saved=base/key
        if saved.exists():return saved.read_bytes()
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=60) as response:
        data=response.read()
    if not data:raise ValueError('Empty resource')
    CACHE.mkdir(exist_ok=True)
    (CACHE/key).write_bytes(data)
    return data

def main():
    OUTPUT.mkdir(exist_ok=True)
    html=(SOURCE/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'  <meta http-equiv="Content-Security-Policy"[^>]+>\n','',html)
    css=(SOURCE/'style.css').read_text(encoding='utf-8')
    kinetic=(SOURCE/'kinetic.css').read_text(encoding='utf-8')
    workflow=(SOURCE/'workflow.css').read_text(encoding='utf-8')
    official=(SOURCE/'official-qa.css').read_text(encoding='utf-8')
    ritual=(SOURCE/'catalog-ritual.css').read_text(encoding='utf-8')
    web_motion=(SOURCE/'web-motion.css').read_text(encoding='utf-8')
    credential=(SOURCE/'credential.css').read_text(encoding='utf-8')
    compatibility=(SOURCE/'compatibility.css').read_text(encoding='utf-8')
    dossier=(SOURCE/'dossier.css').read_text(encoding='utf-8')
    fixed=(SOURCE/'dossier-fixed.css').read_text(encoding='utf-8')
    session=(SOURCE/'session.css').read_text(encoding='utf-8')
    missions=(SOURCE/'missions.css').read_text(encoding='utf-8')
    file_import=(SOURCE/'import.css').read_text(encoding='utf-8')
    onboarding=(SOURCE/'onboarding.css').read_text(encoding='utf-8')
    scripts={name:(SOURCE/name).read_text(encoding='utf-8') for name in ['vendor/html-to-image.min.js','vendor/pdf-lib.min.js','compatibility.js','workflow.js','catalog-interaction.js','export.js','hover.js','rules.js','storage.js','dice.js','engine.js','live-update.js','motion.js','scroll.js','enrollment.js','credential.js','photo.js','mission-view.js','dossier.js','layout.js','import.js','default-agent.js','onboarding.js','app.js']}
    text=''.join(sorted(set(re.findall(r'[\u3000-\u9fff\uff00-\uffef]',html+css+kinetic+workflow+official+ritual+web_motion+credential+compatibility+dossier+fixed+session+missions+file_import+onboarding+''.join(scripts.values())))))
    ascii_text=''.join(chr(i) for i in range(32,127))
    styles=[]
    requests=[('Barlow Condensed','400;500;600;700;800',ascii_text)]
    requests += [('Noto Sans SC','400..900',(ascii_text if i==0 else '')+text[i:i+500]) for i in range(0,len(text),500)]
    for family,weights,glyphs in requests:
        url='https://fonts.googleapis.com/css2?family='+urllib.parse.quote_plus(family)+':wght@'+weights+'&display=swap&text='+urllib.parse.quote(glyphs,safe='')
        face=fetch(url).decode()
        if family=='Noto Sans SC':
            assert face.count('@font-face')==1, 'Font subset request unexpectedly expanded'
            unicode_range=', '.join(f'U+{ord(c):X}' for c in glyphs)
            face=re.sub(r'\n}',f'\n  unicode-range: {unicode_range};\n}}',face)
        styles.append(face)
    styles='\n'.join(styles)
    urls=sorted(set(re.findall(r'url\((https://[^)]+)\)',styles)))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        fonts=list(pool.map(fetch,urls))
    for url,data in zip(urls,fonts):
        assert data[:4]==b'wOF2'
        styles=styles.replace(url,'data:font/woff2;base64,'+base64.b64encode(data).decode('ascii'))
    (SOURCE/'fonts.css').write_text(styles,encoding='utf-8')
    for name,content in {'fonts.css':styles,'style.css':css,'kinetic.css':kinetic,'workflow.css':workflow,'official-qa.css':official,'catalog-ritual.css':ritual,'web-motion.css':web_motion,'credential.css':credential,'compatibility.css':compatibility,'dossier.css':dossier,'dossier-fixed.css':fixed,'session.css':session,'missions.css':missions,'import.css':file_import,'onboarding.css':onboarding}.items():
        pattern=rf'<link rel="stylesheet" href="{re.escape(name)}(?:\?[^\"]*)?">'
        html,count=re.subn(pattern,lambda _: '<style>\n'+content+'\n</style>',html)
        assert count==1, f'Missing stylesheet: {name}'
    for name in scripts:
        pattern=rf'  <script src="{re.escape(name)}(?:\?[^\"]*)?" defer></script>\n'
        html,count=re.subn(pattern,'',html)
        assert count==1, f'Missing script: {name}'
    policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob: 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
    html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="'+policy+'">')
    bundled='\n'.join('<script>\n'+code.replace('</script','<\\/script')+'\n</script>' for code in scripts.values())
    html=html.replace('</body>',bundled+'\n</body>')
    licenses=[]
    for name in ['barlowcondensed','notosanssc']:
        licenses.append(fetch(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{name}/OFL.txt').decode('utf-8'))
    license_text='\n\n'.join(licenses)
    assert all('SIL OPEN FONT LICENSE' in license for license in licenses)
    license_text+='\n\n'+(SOURCE/'vendor/html-to-image-LICENSE.txt').read_text(encoding='utf-8')+'\n\n'+(SOURCE/'vendor/pdf-lib-LICENSE.txt').read_text(encoding='utf-8')
    html=html.replace('</html>','<!--\nFont licenses\n'+license_text.replace('--','- -')+'\n-->\n</html>')
    assert not re.search(r'(?:src|href)=["\']https?://',html)
    assert not re.search(r'url\(["\']?https?://',html)
    assert '<select' not in html.lower() and '<datalist' not in html.lower()
    assert all('@import' not in content for content in [styles,css,kinetic,workflow,official,ritual,web_motion,credential,compatibility,dossier,fixed,session,missions,file_import,onboarding])
    output=OUTPUT/'Triangle-Agency-Offline.html'
    output.write_text(html,encoding='utf-8')
    (OUTPUT/'Triangle-Agency-Offline-v2.html').write_text(html,encoding='utf-8')
    (OUTPUT/'FONT-LICENSES.txt').write_text(license_text,encoding='utf-8')
    instructions='''三角机构·职工档案 V2.28

打开 Triangle-Agency-Offline.html 即可使用。压缩包请先解压。
字体、规则条目、程序和图形均已内置，无需联网、登录或安装运行环境。
手机请用支持 JavaScript 的浏览器打开 HTML 文件。

编辑：身份、27 个固定 ARC 组件、C 职能的资质评估、三段关系与入职问卷。五个栏目实时提示未填数量；ARC 三张构成卡也分别显示未填数量。姓名与人称代词同排，联系人与关系共用分区框，另有邮箱或电话。指纹区域右侧对齐，仅显示指纹与四角框，无文字或进度条；按住时图案描线变红，1.6 秒后完成离线登记，提前松开或滑动会取消；登记状态随档案保存，可撤销。下一项与完成建档位于标题右侧。
资质：左侧 MAX 大三角、名称与九枚正反交错三角链，编辑、执行、查阅、A4 输出统一排版。人员档案的资质页只读，标题下显示说明，移除资质保证与 Q 行；名称后用旋转蓝色三角内的数字标注异常能力 1／2／3，红色实心三角内含白色描边圆，标注职能评估提供的资质；说明行使用相同的实际蓝红图标，数字保持正向。
执行：先选择执行任务或快捷执行任务。普通任务填写名称后进入外勤执行；快捷任务单页录入资源增减、共享混沌、关系连结与评优，结束时 QA 自动补满，不提供额外 QA 调整，结束后回到入口。任务与报告奖励不预选，结算逐项说明来源。MVP／察看期立即免费点亮职能／异常体格，不划其他轨；具体收益可稍后分配。工作生活轨按职能／现实／异常体纵向排列，每条轨道采用十五格去程、十五格回程的两排路线；缩小格子，保留圆角无描边格与粗连线，投入按钮在各轨标题右侧。快捷任务所有输入框与主界面共用样式。回退升级后移除该条持久记录，旧存档与 JSON 同样过滤已回退条目。
数值更新保留卡片节点与正在播放的动画。联系方式下方可选上传证件照（PNG、JPEG、WebP，不超过 4 MB）；照片在本地压缩并保存在当前档案中；透明照片保留 PNG 通道，显示在档案第一页与特工通行证中，通行证照片边长放大 25%，不上传服务器。手机指纹位于人称代词右侧，与输入框等高。
执行页始终保留左右双栏与同排四项资源，手机缩小整版同时显示。档案与 A4 共用蓝、暖黄、红、深紫分色，资质名称在三角链右侧，第二页显示职能、关系路线和紧急联系人，右侧整栏为 C／R／A 投入时间路线，不显示掷骰速查。网页档案的旋转标记、几何与标题轨迹可以动态显示；A4 预览、打印、PDF 与 PNG 均为静态。
打印操作左侧可切换“隐藏变动数据”，清空资源余额、当前与上限 QA、三角填色、评级、进度、关系连结及状态；“打印空白卡”使用独立填写模板，不修改或清空现有角色。设置即时反映在排版预览以及三种输出中。
查阅：前三页 A4 保持固定，有已完成任务时从第四页增加任务档案，每页两次任务，超出自动续页。第一页身份、照片、资质、现实与能力；第二页职能、人际关系路线、投入时间路线与紧急联系人；第三页问题与角色细节。不显示年薪、外貌和笔记。几何填充采用蓝色疏密拼面、金色折纸、红色碎片、紫色嵌套三角和灰色切面，网页缓慢变化，A4 输出保持静态。投入时间为无描边圆角格、粗连线；不显示格号或空位点，代码与职位居中。
打印/预览 A4：打印、保存 PDF、保存 A4 三个独立操作。PNG 为 2480 × 3508、300 DPI，多页图片自动打包。档案前三页固定，任务历史按需追加，长回答在对应区域内自动缩排，保留全文。支持黑白与排版预览。
动效：ARC 蓝黄红流式目录、移动选中底片、页面与栏目定向裁切、分层弹窗、三段任务结算；动态边缘同步形变，离开悬停平滑回正。主框保持白底，无扫光。顶栏可手动开启或关闭动效。
构成特工：目录自动换行；所有端的快捷目录默认只显示三角按钮，固定在右下角；按住即展开目录，移动鼠标或手指瞄准条目，松开跳转；移出目录后松开取消。点击展开完整目录，点击空白、再次点击按钮或按 Esc 收回；选择目录项后自动收回。展开和收回均使用平移裁切动效。手机 ARC 选项采用紧凑排版，数字与文字同排、自动换行。正文宽度不被目录占用。概述收录手册基础正文，右侧快捷目录定位能力、触发器、入职问题等内容。角色细节自由输入，原示例保留为输入提示。详解、评估和角色细节在冻结栏切换。先按住 0.55 秒，再完成 1.35 秒的环形进度以选定当前组件。提前松开、移动或滚动会取消，内容区边缘设有防误触安全区。文本框与选项按钮保持普通操作。键盘可长按空格或回车。每个 C 显示自己的评估题目；未选定时灰度禁用，选定后才能填写。长按确认界面覆盖 A／R／C 切换按钮下方的整个区域，包括选项目录、冻结标题和正文。有效按下时，右上方流体文字立即加强形变；滚动或进入边缘安全区会停止按压反馈。

滚动：网页、弹窗和内部面板共用红黑分段滚动条；鼠标滚轮缓停，逐帧位置写入避开浏览器原生平滑滚动冲突，边缘轻微回弹，手机保留原生惯性滑动。拖动滚动条、输入、目录跳转和关闭弹窗会中止已有惯性。关闭动效后恢复普通滚动。
性能：档案页直接排版，六栏批量测量；最近三个档案复用已完成的纸面排版，修改内容或照片后自动更新。离屏纸张延迟绘制，转场旧纸张暂停装饰动画。动效更新限制在当前区域，目录位置按帧合并计算；评估和违例选项局部更新。弹窗打开或页面隐藏时暂停背景动画。
V2.20：填充背景透明度降低 50%，保留持续运动；现实触发器进度在各处统一为方格。4—9 段关系采用双列，九段关系与紧急联系人组成五行网格，空白卡提供九段关系填写区，仍固定三页 A4。
V2.21：工作／生活顺序为职能、现实、异常体；每次投入与分配收益自动留档，刷新后仍可从最近一条升级回退。回退保留填写内容与记录；遇到后续关系或能力变更会先提示。许可行为可取消勾选，同步回收对应嘉奖。六颗四面骰连续旋转并依次落定，全部落定后显示结果与结算；关闭动效时直接显示结果。
打印设置与 A4 预览均可导出完整 JSON，含照片及升级留档，不受打印选项影响。离线文件路径、存档键和格式保持兼容；首次读取新版时在浏览器中保留一份升级前原始存档，已有副本不覆盖。
V2.24：问卷补齐年薪、外貌、主要联系人及原因，原有八个答案槽位不移动。补充问题显示在档案第三页，空白卡和 JSON 同步支持。关系未达 9 点时不能手动入网，旧误标可用“撤销入网标记”纠正；不会自动清除旧入网记录。现实收益显示基础次数、关系网额外次数和待分配次数。

V2.25：回退升级同时移除对应操作日志。旧成长没有留档时，可在工作／生活平衡使用“清理旧成长”，还原成长状态并清空旧操作日志，保留人物填写与任务奖惩。旧结算日志自动恢复为任务档案，未知名称与数值显示未留档；任务计数与可查明细分别显示。

V2.26：将档案 JSON 拖到页面任意位置，松开即可导入，支持同时拖入多份；档案库保留点击选择文件的入口。拖入时显示三角导入提示，已有档案不会被覆盖，共享混沌池保留当前状态。单份文件不超过 6 MB，无效文件跳过并提示。

V2.27：首次使用且没有本地档案时，自带“来福”示例角色，包含提供的照片、填写内容、任务和成长记录。已有本地档案继续原样使用，不重复加入示例，也不覆盖当前角色；“新建档案”仍创建空白角色。
V2.28：首次打开时由研发部门的来福进行头像对话与操作引导；档案库步骤需实际打开文件夹。设置中提供开源地址、动效开关和教程重播。首次导航底片与当前页面同步，旧动画回调不再覆盖新位置；规则速查使用固定高度，正文独立滚动。


档案保存在当前浏览器，支持导入现有 JSON 档案；打印设置与 A4 预览可导出 JSON。请保留当前浏览器数据。存储空间紧张时优先保存当前档案，并回收自动生成的升级前副本。
旧版自由填写的 ARC 会保留在备份数据中，当前 ARC 需要重新从规则组件中选择。
纸面规则中的情境判断由玩家与 GM 确认；未提供的游戏高墙正文不会被补写。

src 文件夹是可编辑源码；其中的 index.html 也可直接打开。
打印时选择 A4、100% 缩放，关闭浏览器自动页眉页脚；可直接保存 PDF 或 300 DPI A4 PNG，多页 PNG 自动打包。
'''
    (OUTPUT/'使用说明.txt').write_text(instructions,encoding='utf-8-sig')
    archive=OUTPUT/'Triangle-Agency-Offline.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in [output,OUTPUT/'使用说明.txt',OUTPUT/'FONT-LICENSES.txt']:z.write(p,p.name)
        for p in SOURCE.rglob('*'):
            if p.is_file():z.write(p,'src/'+p.relative_to(SOURCE).as_posix())
    (OUTPUT/'Triangle-Agency-Offline-v2.zip').write_bytes(archive.read_bytes())
    print(json.dumps({'html_bytes':output.stat().st_size,'zip_bytes':archive.stat().st_size,'embedded_fonts':len(fonts),'ui_chinese_characters':len(text),'external_resources':0},ensure_ascii=False))

if __name__=='__main__':main()
