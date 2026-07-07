import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const dataTranslations = {
  "data.schema_form_data": [
    {
      tKey: "schemaFormData.filter.associatedForm",
      langCodes: {
        "zh-CN": "关联动态表单",
        "en-US": "Associated Schema Form",
      },
    },
    {
      tKey: "schemaFormData.filter.allForms",
      langCodes: {
        "zh-CN": "-- 全部表单 --",
        "en-US": "-- All Forms --",
      },
    },
    {
      tKey: "schemaFormData.filter.formCode",
      langCodes: {
        "zh-CN": "表单编码",
        "en-US": "Form Code",
      },
    },
    {
      tKey: "schemaFormData.filter.formCodePlaceholder",
      langCodes: {
        "zh-CN": "请输入表单编码过滤",
        "en-US": "Please enter Form Code to filter",
      },
    },
    {
      tKey: "schemaFormData.filter.businessId",
      langCodes: {
        "zh-CN": "关联业务 ID",
        "en-US": "Associated Business ID",
      },
    },
    {
      tKey: "schemaFormData.filter.businessIdPlaceholder",
      langCodes: {
        "zh-CN": "请输入业务 ID 过滤",
        "en-US": "Please enter Business ID to filter",
      },
    },
    {
      tKey: "schemaFormData.errors.noSchemaConfig",
      langCodes: {
        "zh-CN": "未找到该表单的 Schema 配置数据",
        "en-US": "Schema config data not found for this form",
      },
    },
    {
      tKey: "schemaFormData.errors.fallbackToRaw",
      langCodes: {
        "zh-CN": "无法加载原表单配置，已为您降级为原始提交数据展示。",
        "en-US": "Cannot load form config. Falling back to raw JSON.",
      },
    },
    {
      tKey: "schemaFormData.detailsTitle",
      langCodes: {
        "zh-CN": "数据提交详情",
        "en-US": "Submitted Data Details",
      },
    },
    {
      tKey: "schemaFormData.rawJsonData",
      langCodes: {
        "zh-CN": "原始提交数据 (JSON)",
        "en-US": "Raw Submitted Data (JSON)",
      },
    },
    {
      tKey: "schemaFormData.actions.view",
      langCodes: {
        "zh-CN": "查看详情",
        "en-US": "View Details",
      },
    },
    {
      tKey: "schemaFormData.actions.delete",
      langCodes: {
        "zh-CN": "删除记录",
        "en-US": "Delete Record",
      },
    },
    {
      tKey: "schemaFormData.deleteConfirmText",
      langCodes: {
        "zh-CN": "确定要删除此条提交的动态表单数据记录吗？此操作不可逆。",
        "en-US":
          "Are you sure you want to delete this submitted form data? This is irreversible.",
      },
    },
    {
      tKey: "schemaFormData.dataSummary",
      langCodes: {
        "zh-CN": "提交数据概要",
        "en-US": "Submitted Data Summary",
      },
    },
    {
      tKey: "schemaFormData.submittedData",
      langCodes: {
        "zh-CN": "提交数据",
        "en-US": "Submitted Data",
      },
    },
    {
      tKey: "schemaFormData.dataContent",
      langCodes: {
        "zh-CN": "数据内容",
        "en-US": "Data Content",
      },
    },
  ],
  "data.schema_form": [
    {
      tKey: "schemaForm.searchPlaceholder",
      langCodes: {
        "zh-CN": "搜索名称或编码...",
        "en-US": "Search name or code...",
      },
    },
    {
      tKey: "schemaForm.code",
      langCodes: {
        "zh-CN": "表单编码",
        "en-US": "Form Code",
      },
    },
    {
      tKey: "schemaForm.name",
      langCodes: {
        "zh-CN": "表单名称",
        "en-US": "Form Name",
      },
    },
    {
      tKey: "schemaForm.actions.add",
      langCodes: {
        "zh-CN": "新增配置",
        "en-US": "Add Configuration",
      },
    },
    {
      tKey: "schemaForm.actions.preview",
      langCodes: {
        "zh-CN": "预览与校验测试",
        "en-US": "Preview & Test",
      },
    },
    {
      tKey: "schemaForm.deleteConfirmText",
      langCodes: {
        "zh-CN":
          "确定要删除动态表单配置吗？此操作不可撤销，且会影响已提交的关联数据还原。",
        "en-US":
          "Are you sure you want to delete this form config? This cannot be undone and affects submitted data.",
      },
    },
    {
      tKey: "schemaForm.errors.invalidObject",
      langCodes: {
        "zh-CN": "Schema 必须是合法的 JSON 对象",
        "en-US": "Schema must be a valid JSON object",
      },
    },
    {
      tKey: "schemaForm.errors.invalidUiObject",
      langCodes: {
        "zh-CN": "UI Schema 必须是合法的 JSON 对象",
        "en-US": "UI Schema must be a valid JSON object",
      },
    },
    {
      tKey: "schemaForm.errors.invalidJson",
      langCodes: {
        "zh-CN": "请输入合法的 JSON 格式字符串",
        "en-US": "Please enter a valid JSON format string",
      },
    },
    {
      tKey: "schemaForm.editTitle",
      langCodes: {
        "zh-CN": "编辑动态表单配置",
        "en-US": "Edit Schema Form Configuration",
      },
    },
    {
      tKey: "schemaForm.addTitle",
      langCodes: {
        "zh-CN": "新增动态表单配置",
        "en-US": "Add Schema Form Configuration",
      },
    },
    {
      tKey: "schemaForm.quickTemplate",
      langCodes: {
        "zh-CN": "快速套用预设模板",
        "en-US": "Quick Preset Template",
      },
    },
    {
      tKey: "schemaForm.selectTemplate",
      langCodes: {
        "zh-CN": "-- 选择模板 --",
        "en-US": "-- Select Template --",
      },
    },
    {
      tKey: "schemaForm.templates.feedback",
      langCodes: {
        "zh-CN": "用户意见反馈表",
        "en-US": "User Feedback Template",
      },
    },
    {
      tKey: "schemaForm.templates.rsvp",
      langCodes: {
        "zh-CN": "活动报名登记表",
        "en-US": "Activity RSVP Template",
      },
    },
    {
      tKey: "schemaForm.fields.code",
      langCodes: {
        "zh-CN": "表单唯一编码",
        "en-US": "Unique Form Code",
      },
    },
    {
      tKey: "schemaForm.fields.codePlaceholder",
      langCodes: {
        "zh-CN": "例如: customer_survey (仅支持英文字母、数字、下划线和连字符)",
        "en-US":
          "e.g. customer_survey (Letters, numbers, underscores, hyphens only)",
      },
    },
    {
      tKey: "schemaForm.fields.name",
      langCodes: {
        "zh-CN": "表单名称",
        "en-US": "Form Name",
      },
    },
    {
      tKey: "schemaForm.fields.namePlaceholder",
      langCodes: {
        "zh-CN": "例如: 客户满意度回访表",
        "en-US": "e.g. Customer Satisfaction Survey",
      },
    },
    {
      tKey: "schemaForm.fields.schemaData",
      langCodes: {
        "zh-CN": "JSON Schema 配置数据",
        "en-US": "JSON Schema Data",
      },
    },
    {
      tKey: "schemaForm.fields.uiSchemaData",
      langCodes: {
        "zh-CN": "UI Schema 配置数据 (可选)",
        "en-US": "UI Schema Data (Optional)",
      },
    },
    {
      tKey: "schemaForm.fields.remarkPlaceholder",
      langCodes: {
        "zh-CN": "请输入备注描述",
        "en-US": "Please enter remark description",
      },
    },
    {
      tKey: "schemaForm.errors.parseSchemaFailed",
      langCodes: {
        "zh-CN": "无法解析该表单的 JSON Schema，请检查配置是否正确。",
        "en-US": "Unable to parse JSON Schema, please check config.",
      },
    },
    {
      tKey: "schemaForm.errors.submitValidationFailed",
      langCodes: {
        "zh-CN": "数据提交校验失败，请检查填写内容。",
        "en-US": "Validation failed, please check inputs.",
      },
    },
    {
      tKey: "schemaForm.previewTitle",
      langCodes: {
        "zh-CN": "表单预览与提交测试",
        "en-US": "Form Preview & Submission Test",
      },
    },
    {
      tKey: "schemaForm.testSubmitSuccess",
      langCodes: {
        "zh-CN":
          "数据提交测试成功！已写入/更新 system_schema_form_data 关联表。",
        "en-US": "Submission success! Saved to system_schema_form_data.",
      },
    },
    {
      tKey: "schemaForm.fields.testBusinessId",
      langCodes: {
        "zh-CN": "测试关联业务 ID (Business ID)",
        "en-US": "Test Business ID",
      },
    },
    {
      tKey: "schemaForm.fields.testBusinessIdPlaceholder",
      langCodes: {
        "zh-CN": "请输入用于归属的业务主键 ID",
        "en-US": "Please enter Business ID",
      },
    },
    {
      tKey: "schemaForm.submitTestData",
      langCodes: {
        "zh-CN": "提交测试数据",
        "en-US": "Submit Test Data",
      },
    },
    {
      tKey: "schemaForm.errors.noValidSchema",
      langCodes: {
        "zh-CN": "未配置有效的 JSON Schema",
        "en-US": "No valid JSON Schema configured",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "data.schema_form_data" | "data.schema_form">,
  TranslationInputItem[]
>;
