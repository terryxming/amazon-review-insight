# Sorftime Contract

sorftime_contract_version: v0.1.0

## 工具

- `product_reviews`：查询 Amazon 产品近一年用户留评，最多返回 100 条评论。
- `product_detail`：查询 Amazon 产品详情数据。

## 参数

`product_reviews`：

- `asin`：必填。
- `amzSite`：固定 `US`。
- `reviewType`：默认 `Both`。

`product_detail`：

- `asin`：必填。
- `amzSite`：固定 `US`。

## 返回口径

- `product_reviews` 外层返回 `result.content[0].text`。
- `product_reviews` 的 `text` 是 JSON 数组字符串。
- Review 字段使用中文字段名：`评论产品的属性`、`评论日期`、`评星`、`标题`、`评论`。
- `评论日期` 当前格式为 `yyyyMMdd`。
- `product_detail` 外层返回 `result.content[0].text`。
- `product_detail` 的 `text` 是中文键值文本。
- `product_detail` 字段 `评论数` 展示为 ASIN 总评论数量，含义是 ASIN 总评论数量，包含 review 和 rating。

## 缺失字段

当前 `product_reviews` 不保证返回 Review ID、reviewer name、verified purchase、helpful vote、Amazon review URL、抓取页码、Vine 字段。缺失信息不得推断，报告需要时展示 `unknown`。
