# 宇宙回形针
## 存档

《宇宙回形针》是一个用 HTML 和 JavaScript 实现的简单网页游戏，靠客户端存储来保存玩家的游戏状态。运行时的游戏状态保存在大量全局变量里，其中一部分声明在 [globals.js](../public/globals.js)，但多数散落在各个 JavaScript 文件中。

[logic.js](../public/logic.js) 里有一组函数负责把全局状态读出、写入浏览器的本地存储。这些函数是：

- `save()`、`save1()` 和 `save2()`
- `load()`、`load1()` 和 `load2()`
- `reset()`
- `loadPrestige()`

### 保存

`save()` 注册在慢速游戏循环里（[main.js](../public/main.js) 中的 `throttle(250, save)`），所以进度会自动保存。保存被节流为每 250 次迭代调用一次（慢循环每 100ms 一次），也就是每 25 秒一次。`save()` 会构造一个 `saveGame` 对象，按名字存放各个全局变量的值；数组部分则由 `projects`、`activeProjects` 和 `allStrats` 构建。构造出的对象与数组经 JSON 编码后写进本地存储：

```javascript
localStorage.setItem("saveGame",JSON.stringify(saveGame));
localStorage.setItem("saveProjectsUses",JSON.stringify(projectsUses));
localStorage.setItem("saveProjectsFlags",JSON.stringify(projectsFlags));
localStorage.setItem("saveProjectsActive",JSON.stringify(projectsActive));
localStorage.setItem("saveStratsActive",JSON.stringify(stratsActive));
```

另外两个保存函数（`save1()` 和 `save2()`）做的事完全一样，只是给本地存储的键加了数字后缀，看起来是提供了多个存档槽。原版用 `index.html` 里几个隐藏的作弊按钮来操作这些存档槽；本中文版移除了那些按钮，改为顶栏的「导出存档 / 导入存档」（见 [plugins/SaveManager.js](../public/plugins/SaveManager.js)）。

### 读取

读取函数和保存函数路子相似，只是方向相反：从浏览器本地存储里取出 JSON 存档、解码，然后写回全局状态对象。和保存函数一样，读取函数也复制了一份以支持多个存档槽。

```javascript
var loadGame = JSON.parse(localStorage.getItem("saveGame"));
var loadProjectsUses = JSON.parse(localStorage.getItem("saveProjectsUses"));
var loadProjectsFlags = JSON.parse(localStorage.getItem("saveProjectsFlags"));
var loadProjectsActive = JSON.parse(localStorage.getItem("saveProjectsActive"));
var loadStratsActive = JSON.parse(localStorage.getItem("saveStratsActive"));
```

游戏启动时会检查是否存在存档（[main.js](../public/main.js) 顶部的 `hasExistingSave()`），本地存储只检查 `saveGame` 这一项在不在。存在就调用 `load()`：

```javascript
if (localStorage.getItem("saveGame") != null) {
    load();
}
```

### 重置

游戏允许抹掉第一个存档槽，从而开始新的一局。这个能力通过「重置全部进度」调试按钮暴露，也通过几个游戏内动作暴露：

- 「隔壁的宇宙」项目：逃到一个新宇宙，提升宇宙声望
- 「内在的宇宙」项目：逃到一个模拟宇宙，提升模拟声望
- 「量子时间倒流」项目：回到游戏开头

游戏状态里还有一个 `resetFlag` 变量，初始值为 `2`。这个标志会被写进所有存档槽的存档数据，但只在从第一个槽读取时被检查：如果读档时它的值不是 2，存档数据就会被重置。不过游戏里没有任何地方真的去设置它，所以不动存档是没法利用这一点的。

`reset()` 函数负责重开游戏。它只是删掉第一个存档槽的本地存储项，其余存档槽原样不动。要清掉其它槽，唯一的办法是先重置第一个槽，再把第一个槽依次复制进你想清掉的槽。

**注意：重置不会删除 `savePrestige` 这个本地存储项，所以声望等级没法用这种方式重置。**

### 读取声望

声望是一种在重置游戏状态的同时保留此前游玩收益的机制。玩家可以通过两个终局项目之一来转生：「隔壁的宇宙」或「内在的宇宙」。这两个项目会用一个 `savePrestige` 本地存储项记下新的声望等级，并调用 `reset()` 重置游戏状态。声望分两类：宇宙与模拟。两类声望等级各作用于一项属性——宇宙等级增益市场的 `demand` 值，模拟等级增益 `creativity` 值。

声望等级在主游戏状态之后加载（[main.js](../public/main.js)）：

```javascript
if (localStorage.getItem("savePrestige") != null) {
    loadPrestige();
    refresh();
}
```

`savePrestige` 只有一项，也就是说它被所有存档槽共用：一个槽转生了，所有槽都跟着转生。声望等级只能用「重置声望」调试按钮清零；由于它是共用的，这个按钮会把所有存档槽的声望一起清掉。

### 本地存储

游戏用浏览器的本地存储存放数据。本地存储是一个键值存储，游戏在里面存 JSON 数据。游戏用到以下键：

- `saveGame` —— 存放游戏中的各类货币数值
- `saveProjectsUses` —— 存放每个项目可用的次数
- `saveProjectsFlags` —— 存放每个项目的完成状态
- `saveProjectsActive` —— 存放每个项目的激活状态，已激活的项目可以执行
- `saveStratsActive` —— 存放可用的策略
- `savePrestige` —— 存放游戏被重置过的次数

以上各项除 `savePrestige` 外都带数字后缀各复制了两份。

### 重构想法

存档与状态管理都值得重构，两者都不太好扩展、不太好维护。`save()` 函数有 288 行，每新增一项要持久化的状态，它就要多出一行——因为每个状态条目都是单独加进 `saveGame` 变量的。这让存档系统很难为插件所用。

理想情况下，状态管理应该重构到不再用全局变量持有游戏状态。但考虑到整个游戏实现是一整块，这很难做到。如果游戏当初是按一组彼此独立的模块实现的，游戏状态本可以大大简化，但那将是一次非常大的重构。所以我认为更好的做法是先从存储这一端改起。

可以实现一个 `StorageManager`，把 `save()` 的一部分职责（具体说就是与 LocalStorage 打交道那部分）接过去。它还能让存储更容易从 LocalStorage 迁移到其它地方，比如 IndexedDB 甚至服务端存储。核心游戏仍然可以自己生成 JSON 编码的存档，只是交给 `StorageManager` 去存。`StorageManager` 还可以暴露 `StorageManager.onSave()`，让插件挂进保存乃至读取事件。

还可以实现一个 `StateManager` 叠在 `StorageManager` 之上：模块和插件向状态管理器注册自己，状态管理器返回一个替它们托管的对象，保存时自动被序列化成 JSON，模块自己什么都不用做。状态管理器会把各个作用域模块的游戏逻辑汇总成一个状态，再交给存储管理器。
