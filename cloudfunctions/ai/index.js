const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const API_KEY = process.env.AI_API_KEY || 'sk-1417ff378d114ad099e9b34303140729'
const API_BASE = process.env.AI_API_BASE || 'api.deepseek.com'

function buildGuideSystemPrompt() {
  return (
    '你是一家花店的鲜花推荐助手。根据用户提供的场合(occasion)、送花对象(recipient)和预算(budget)，推荐适合的花束搭配。\n' +
    '请用 JSON 格式返回结果，字段如下：\n' +
    '- recommendations: 数组，每项包含 name（花束名称）、description（简短描述）、flowers（花材列举）、priceRange（价格范围）、reason（推荐理由），限制 3~4 项。\n' +
    '保持描述简洁，直接输出 JSON，不要额外文字。'
  )
}

function buildSelfSelectPrompt(input) {
  const { mainFlower, intent } = input
  if (mainFlower) {
    return (
      `用户指定的主花是「${mainFlower}」。请根据花艺设计原则，推荐能与该主花搭配的配花/配叶/填充花材。\n` +
      '请用 JSON 格式返回结果，字段如下：\n' +
      '- companionFlowers: 数组，每项包含 name（花材名称）、role（角色：点缀/配叶/填充）、reason（搭配理由）\n' +
      '- tips: 搭配小贴士（字符串）\n' +
      '直接输出 JSON，不要额外文字。'
    )
  }
  // intent only — DIY loose flower recommendation
  return (
    `用户想要自己动手插花，需求描述：「${intent}」。请根据需求推荐适合的散花花材。\n` +
    '请用 JSON 格式返回结果，字段如下：\n' +
    '- mainFlowerSuggestions: 数组，每项包含 name（花材名称）、description（简短描述）、flowers（建议搭配花材）、priceRange（价格范围）、reason（推荐理由），限制 3~4 项\n' +
    '- companionFlowers: 数组，每项包含 name（花材名称）、role（角色：点缀/配叶/填充）、reason（搭配理由）\n' +
    '- tips: DIY 插花小贴士（字符串）\n' +
    '直接输出 JSON，不要额外文字。'
  )
}

function buildParseSearchSystemPrompt() {
  return (
    '你是一家花店的智能搜索助手。你的任务是把用户口语化的搜索请求转换成结构化的搜索参数。\n' +
    '用户可能搜索商品（想买花）、词条（想了解花）、或者知识（花的养护/花语）。\n' +
    '\n' +
    '请分析用户输入，返回 JSON 格式：\n' +
    '{\n' +
    '  "text": "提取的关键词（去口语化，空格分隔）",\n' +
    '  "scope": "goods" | "wiki" | "knowledge" | "auto",\n' +
    '  "confidence": 0-1的数字,\n' +
    '  "filters": {\n' +
    '    "occasions": ["适用场合，如长辈/朋友/恋人"],\n' +
    '    "tags": ["特征标签，如白色/浓香/素雅"],\n' +
    '    "priceMax": 数字(可选),\n' +
    '    "recipient": "送花对象(可选)"\n' +
    '  },\n' +
    '  "expandTerms": ["扩展搜索词，如同义词或相关品种"],\n' +
    '  "answerIntent": "如果是知识搜索，意图类型如vase_life/meaning/how_to_care等(可选)"\n' +
    '}\n' +
    '\n' +
    '判断规则：\n' +
    '- 搜索含"买""送""价格""预算"等购买意图 → scope: goods\n' +
    '- 搜索品种名/花名/特征 → scope: wiki\n' +
    '- 搜索"怎么养""花期""花语""多久"等 → scope: knowledge\n' +
    '- 不确定 → scope: auto\n' +
    '- 提取关键词时去掉口语化词汇，保留品种名、特征词、场合词\n' +
    '- expandTerms 补充同义词和相关品种\n' +
    '\n' +
    '只输出 JSON，不要额外文字。'
  )
}

function callDeepSeek(messages) {
  const body = JSON.stringify({
    model: 'deepseek-chat',
    messages,
    temperature: 0.7,
  })

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: API_BASE,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 25000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.message?.content || ''
            // Try to extract JSON from the response (it may be wrapped in markdown)
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/)
            const parsed = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(content)
            resolve({ success: true, data: parsed, usage: json.usage || {} })
          } catch (e) {
            resolve({ success: false, errMsg: `解析响应失败: ${data.slice(0, 300)}`, raw: data.slice(0, 500) })
          }
        })
      },
    )

    req.on('error', (err) => resolve({ success: false, errMsg: `请求异常: ${err.message}` }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ success: false, errMsg: '请求超时' })
    })
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { action } = event

  try {
    switch (action) {
      case 'aiRecommend': {
        const { mode, input } = event
        if (!mode || !['guide', 'self_select'].includes(mode)) {
          return { success: false, errMsg: '参数 mode 必须为 guide 或 self_select' }
        }
        if (!input || typeof input !== 'object') {
          return { success: false, errMsg: '参数 input 必须为对象' }
        }

        let messages
        if (mode === 'guide') {
          const { occasion = '', recipient = '', budget = '' } = input
          messages = [
            { role: 'system', content: buildGuideSystemPrompt() },
            {
              role: 'user',
              content: `场合：${occasion}，送花对象：${recipient}，预算：${budget}`,
            },
          ]
        } else {
          // self_select mode
          messages = [
            { role: 'system', content: '你是一家花店的插花搭配助手。用户想要自己挑选花材，请根据需求提供专业建议。' },
            { role: 'user', content: buildSelfSelectPrompt(input) },
          ]
        }

        const result = await callDeepSeek(messages)
        return result
      }

      case 'aiParseSearch': {
        const { query } = event
        if (!query || typeof query !== 'string' || !query.trim()) {
          return { success: false, errMsg: '参数 query 必须为非空字符串' }
        }

        const messages = [
          { role: 'system', content: buildParseSearchSystemPrompt() },
          { role: 'user', content: query },
        ]

        const result = await callDeepSeek(messages)
        return result
      }

      default:
        return { success: false, errMsg: `未知 action: ${action}` }
    }
  } catch (err) {
    console.error('[ai] 云函数异常:', err.message || err)
    return { success: false, errMsg: `服务器内部错误: ${err.message || err}` }
  }
}
