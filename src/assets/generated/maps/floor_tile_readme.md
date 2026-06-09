# 黎明时分：星存者 程序化像素风循环地板贴图

本目录下的 6 张战斗背景均由 `Tools/Maps/generate-playable-maps.mjs` 纯代码生成，没有使用 AI 图像生成。
输出是纯平面地板贴图，不包含建筑、道具、墙体、柱子、树、机器、喷泉、书架、电车、塔、路灯、桌椅、障碍物、碰撞体或立体物体。

## Unity 导入建议

- Texture Type: Sprite (2D and UI) 或 Default
- Filter Mode: Point
- Wrap Mode: Repeat
- Compression: None 或关闭有损压缩
- Pixels Per Unit: 32
- Generate Mip Maps: Off
- 在 Unity 内缩放时使用整数倍，避免非整数缩放造成像素抖动。

## 生成结果

| 地图 | 主色 | 图案规则 | PNG | 3x3 预览 | Seam Test |
| --- | --- | --- | --- | --- | --- |
| MAP001 星光咖啡厅外广场 | 奶白、浅灰蓝、蓝紫星轨、浅金光点 | 32px 方形广场地砖，64px 低对比度大砖变化，周期性蓝紫星轨线，少量 8px 浅金平面光点。 | starlight-cafe.png | previews/starlight-cafe-3x3.png | 通过，LR=0，TB=0 |
| MAP002 月夜公园 | 深蓝绿、蓝紫草坪砖、浅蓝月光斑 | 32px 草坪地砖，规整蓝紫块面变化，低对比月光斑，少量发光步道线，无树和草丛实体。 | moon-park.png | previews/moon-park-3x3.png | 通过，LR=0，TB=0 |
| MAP003 废弃研究所 | 浅灰、蓝灰、银白金属、淡青电路线 | 规整金属方砖与伪六边形角线，淡青电路只做地面线条，周期扫描线，无机器、管道、墙体。 | abandoned-lab.png | previews/abandoned-lab-3x3.png | 通过，LR=0，TB=0 |
| MAP004 梦境图书馆 | 蓝紫透明地砖、淡金数据线、平面书页纹 | 32px 蓝紫透明感地砖，淡金数据线，规律小书页轮廓只作为地面纹路，无书架、桌子、实体书。 | dream-library.png | previews/dream-library-3x3.png | 通过，LR=0，TB=0 |
| MAP005 云端电车站 | 透明蓝白站台地砖、星轨线、淡云雾块 | 透明蓝白站台方砖，平面星轨线和淡云雾色块，全部是地板图案，无电车、栏杆、站台门。 | sky-train-station.png | previews/sky-train-station-3x3.png | 通过，LR=0，TB=0 |
| MAP006 黎明星环塔 | 深蓝科技平台、蓝金线、浅青、黎明暖色 | 深蓝高空科技平台方砖，蓝金圆环能量线和平面黎明色带，无塔、核心装置、实体星环或柱子。 | dawn-ring-tower.png | previews/dawn-ring-tower-3x3.png | 通过，LR=0，TB=0 |

## 说明

- 每张图尺寸均为 1024x1024 PNG。
- 每张图颜色控制在 8-16 种左右，使用清晰像素块、地砖网格和低对比度规整纹理。
- `collisionRects` 为空数组，玩法上按 100% 可行走处理。
- `previews/*.png` 是 3x3 拼接预览，用于人工检查四方无缝循环。
