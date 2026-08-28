# API 文档

本文档提及的相关条目与内容正在开发与实验，可能会**频繁修改**

特别的，对于未实现的内容，将以*灰色、斜体*标识

# 扩展类型定义

JavaScript 对象

##  type 标识符

- 类型：`字符串`

由下划线和字母构成，全局唯一

示例：MY\_FIRST\_EXTENSION

##  title 显示名称

- 类型：`字符串`

建议2\~5字，会展示在\[仅K3/K4\]积木盒和\[仅KN\]积木盒内部

示例：我的扩展

##  icon 图标

- 类型：`字符串`/`对象`

支持常见的网络图片格式，会展示在积木盒

为`字符串`时将同时作为选中与未选中时图标

### icon\.normal? 未选中时图标

- 类型：`字符串`

### icon\.selected? 选中时图标

- 类型：`字符串`

## *** docs? 文档*

扩展文档

##  color 颜色

决定了\[仅K3/KN\]积木盒颜色与方法积木默认颜色

##  methods 方法积木

- 类型：`列表<方法积木>`

此处仅介绍CUE积木的独特属性

### method\.type 方法标识符

- 类型：`字符串`

扩展内唯一

### method\.color? 积木颜色

- 类型：`字符串`

不存在时使用扩展颜色

### \[仅KN\] method\.shortBlock? 短积木样式

- 类型：`列表<短积木样式项>`

#### *文字*

#### *颜色*

#### *图片*

*用于事件头、符号等*

#### *圆框*

*用于值输入、事件参数等*

#### *方框*

*用于下拉框等*

### method\.function 解释器

- 类型：`函数(积木参数: 对象<参数标志符, 参数值>, 工具: 对象) -> 任意`

积木运行时将会调用此函数

**支持异步函数\(Promise\)**

#### utils 工具

##### 继承[【通用工具】模块](https://better-nemo.feishu.cn/wiki/QOyfw0svpi14Mxkr42ScBsCAnnc#share-OCHwdgtjto8tJHxRShTcki5Knjd) 的所有方法

##### \[仅KN\] console 控制台

计划中：在其它环境中添加控制台

- 输出：utils\.console\.log\(\.\.\.msg\)

- 警告：utils\.console\.warn\(\.\.\.msg\)

- 报错：utils\.console\.error\(\.\.\.msg\)

##### *抛出中断错误*

##### \[仅KN\] actor 角色

计划中：支持其它环境

待补充

###### actor\.brush 画笔

待补充

###### actor\.brush\.ctx 画布上下文

待补充

###### 示例：绘制二维码

```JavaScript
function example({ text, size }, { actor }) {
    // 将角色坐标转换为画布坐标
    const { x, y } = actor.app.app.stage.toGlobal(actor.position);
    // 画布上下文
    const ctx = actor.brush.ctx;
    // 生成二维码
    const div = document.createElement("div");
    new QRCode(div, { text, width: size, height: size });
    const img = div.querySelector("img");
    img.setAttribute("style", "");
    img.onload = () => {
        // 保存状态
        ctx.save();
        // 设置位置与方向
        ctx.translate(x, y);
        ctx.rotate(actor.rotation);
        // 绘制二维码
        ctx.drawImage(img, 0, 0, size, size);
        // 恢复状态
        ctx.restore();
        // 更新
        actor.parent_scene.should_update_brush();
    };
}
```

### \.\.\.\.\.\.

更多内容请参考 [Blockly 指南 \- 创建自定义块](https://docs.blockly.com/guides/create-custom-blocks/overview/)

##  events 事件积木

- 类型：`列表<事件积木>`

### event\.type 标识符

- 类型：`字符串`

扩展内唯一

### event\.text 事件显示文本

- 类型：`字符串`

### event\.color? 积木颜色

- 类型：`字符串`

非必要不建议更改，不存在时使用\#608FEE

### [\[仅KN\] event\.shortBlock? 短积木样式（同方法积木）](https://better-nemo.feishu.cn/wiki/QOyfw0svpi14Mxkr42ScBsCAnnc#share-COK9dfjwho9jv5xW8RLcOuaFnHf)

### event\.icon 事件图标

- 类型：`字符串`

支持常见的网络图片格式

### event\.params? 事件参数

- 类型：`列表<参数>`

#### param\.type 参数标识符

- 类型：`字符串`

事件内唯一

#### param\.text 参数显示文本

- 类型：`字符串`

#### param\.check? 参数类型

- 类型：`字符串`

##  toolbox 积木盒

- 类型：`列表<积木盒项>`

### 方法积木

- type: 固定为`method`

- block: 方法标识符

- gap?: 下方间隔

### *\[仅KN\] 方法积木组*

*组内的所有积木都会显示在同一行，如图*

- *type: 固定为**`inline_methods`*

- *blocks: 列表\<方法标识符\>*



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDc1NTI2NGIyYjI5NzJkZDM1NDk3OTk3ODE3YTY0MDlfNzRhNGY1NDdhMGRiMDkyMmQwN2VkMGQ5OGVjZGRjYzFfSUQ6NzY3MzEwNDkxMTU4NDA3MDg1NF8xNzg3ODk3NzYwOjE3ODc5ODQxNjBfVjM)

### 事件积木

- type: 固定为`event`

- block: 事件标识符

- gap?: 下方间隔

### 文本

- type: 固定为`label`

- text: 文本内容

### 自定义XML

- type: 固定为`xml`

- text: XML文本

### *按钮*

# 导出

```JavaScript
exports.extension = YOUR_EXTENSION_TYPE;
```

# 模块

使用方式：`require(模块名)`

## utils 通用工具

`const utils = require('utils');`

### isPlayer 获取是否为播放器

utils\.isPlayer\(\)

环境为播放器则返回true

### getEnv 获取环境

utils\.getEnv\(\)

获取环境

### onStart 当开始运行

utils\.onStart\(回调: 函数 =\> 无\)

开始运行时触发回调

### onStop 当停止运行

utils\.onStop\(回调: 函数 =\> 无\)

停止运行时触发回调

### emitEvent 触发事件

utils\.emitEvent\(事件标识符: 字符串, 参数: Record\<字符串, 任意\>\)

触发事件

# 特别感谢

（不分先后顺序）

透明质酸钠 凉粉

# 



