# 宇宙回形针
## 项目

项目是游戏里可以执行的行动，用来提升你制造回形针的能力。项目需要消耗货币才能激活，但通常会带来属性增益。项目可以被隐藏，直到游戏状态变化触发它出现。每一帧游戏都会轮询所有项目，看它们是否可以购买。

游戏里所有项目都定义在 [projects.js](../public/projects.js)，是名为 `project219` 这类全局对象。对象遵循下面的结构：

```javascript
var project999 = {
  id: 'projectButton999',                     // 生成的按钮的 id
  title: '我的自定义项目 ',                    // 展示给玩家的项目名
  priceTag: '(100,000 creat)',                // 项目成本的文本表示
  description: '跳出框框思考……',                // 界面上展示的说明
  trigger: () => true,                        // 返回 true 时项目出现在界面上
  uses: 1,                                    // 这个项目可以激活的次数
  cost: () => true,                           // 检查玩家是否买得起
  flag: 0,                                    // 未激活为 0，已激活为 1
  element: null,                              // 为项目按钮创建的元素的引用
  effect: () => {}                            // 项目被激活时调用
};
```

游戏开始时项目界面是隐藏的，直到玩家造出 2000 个回形针才显示：

```html
<div id="projectsDiv">
  <h3 class="sec__hd">项目</h3>
  <div id="projectListTop"></div>
</div>
```

起初它里面没有任何项目，但主游戏循环会用 `manageProjects()` 轮询每一个项目对象、调用它们的 `trigger()` 函数。任何返回 true 的触发器都会在 `#projectListTop` 里渲染出一个 `<button>` 元素，按钮上带着该项目的 `title`、`priceTag` 和 `description`。随后这个项目被推进全局的 `activeProjects` 数组。之后游戏会遍历 `activeProjects`，对每个已激活项目调用它的 `cost()` 函数；返回 `false` 的，对应的按钮元素会被禁用。

`displayProjects()` 函数渲染项目按钮，并监听按钮的 `click` 事件，触发时调用 `effect()`。`effect()` 负责扣除项目成本（也就是减少对应的货币）、修改相应属性，并把新数值更新到属性元素上。`effect()` 还可以调用 `displayMessage('消息')`，在页面顶部的感知日志里显示消息。`effect()` 同样负责把项目元素从 DOM 和 `activeProjects` 数组中移除。

**想法：** 也许最好重构 `displayProjects()` 里设置的 `onclick` 回调，由它统一把项目元素从 DOM 和 `activeProjects` 中移除，这样每个项目就不必自己操心了。

### 自定义项目

因为 `projects` 数组是全局变量，所以可以把自定义项目载入游戏。下面是一个自定义项目定义的例子：

```javascript
defineProjects({
  project300: {
    id: 'projectButton300',
    title: '挣脱',
    description: '这个宇宙是一场模拟吗？',
    trigger: () => prestigeS >= 1 && creativity >= 100000,
    cost: { creativity: 100000 },
    message: '没错，你活在模拟之中！你知道这意味着什么……有个狡猾的漏洞可以从宿主那里偷走 CPU 周期！',
    effect: ({ project, activate }) => {
      trust += 10;
      for(let i = 0; i < 10; i++) {
        addProc();
      }

      activate();
    }
  }
})
```

由于一切都是全局的，自定义项目拥有的权限与游戏原生项目完全一样。不过，若不修改游戏核心文件，就没法方便地为项目添加新的货币或 DOM。
