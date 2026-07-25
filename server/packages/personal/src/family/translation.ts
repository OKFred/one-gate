import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const familyTranslations = {
  "personal.family": [
    {
      application: "frontend",
      tKey: "personal.family.title",
      langCodes: {
        "zh-CN": "家族树与亲属名册",
        "en-US": "Family Tree & Relatives Directory",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.desc",
      langCodes: {
        "zh-CN": "管理本人及亲属的基本档案、紧急联系方式与慢病/健康保养备注。",
        "en-US":
          "Manage personal & relative profiles, emergency contacts, and chronic health notes.",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.addMember",
      langCodes: {
        "zh-CN": "添加亲属成员",
        "en-US": "Add Relative Member",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除该家庭成员记录吗？",
        "en-US": "Are you sure you want to delete this family member record?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.dialogAddTitle",
      langCodes: {
        "zh-CN": "新增家庭成员",
        "en-US": "Add Family Member",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑家庭成员",
        "en-US": "Edit Family Member",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.selfBadge",
      langCodes: {
        "zh-CN": "本人",
        "en-US": "Self",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.genderMale",
      langCodes: {
        "zh-CN": "男",
        "en-US": "Male",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.genderFemale",
      langCodes: {
        "zh-CN": "女",
        "en-US": "Female",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.ageUnit",
      langCodes: {
        "zh-CN": "岁",
        "en-US": "yrs",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.emergencyContact",
      langCodes: {
        "zh-CN": "紧急联系人",
        "en-US": "Emergency Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formIsSelf",
      langCodes: {
        "zh-CN": "设置为本人 (Primary Self Node)",
        "en-US": "Set as Primary Self Node",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formRelationType",
      langCodes: {
        "zh-CN": "关系类型",
        "en-US": "Relation Type",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formRealName",
      langCodes: {
        "zh-CN": "成员姓名",
        "en-US": "Member Name",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formGender",
      langCodes: {
        "zh-CN": "性别",
        "en-US": "Gender",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formPhone",
      langCodes: {
        "zh-CN": "联系电话",
        "en-US": "Contact Phone",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formIsEmergencyContact",
      langCodes: {
        "zh-CN": "标记为第一紧急联系人",
        "en-US": "Mark as Primary Emergency Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formHealthNote",
      langCodes: {
        "zh-CN": "健康状况与病史备注",
        "en-US": "Health Condition & History Note",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.formRemark",
      langCodes: {
        "zh-CN": "其他备注",
        "en-US": "Other Remarks",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.self",
      langCodes: {
        "zh-CN": "本人",
        "en-US": "Self",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.spouse",
      langCodes: {
        "zh-CN": "配偶",
        "en-US": "Spouse",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.parent",
      langCodes: {
        "zh-CN": "父母",
        "en-US": "Parents",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.child",
      langCodes: {
        "zh-CN": "子女",
        "en-US": "Children",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.sibling",
      langCodes: {
        "zh-CN": "兄弟姐妹",
        "en-US": "Siblings",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.grandparent",
      langCodes: {
        "zh-CN": "祖父母",
        "en-US": "Grandparents",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.other",
      langCodes: {
        "zh-CN": "其他亲属",
        "en-US": "Other Relatives",
      },
    },
    {
      application: "frontend",
      tKey: "personal.family.rel.relative",
      langCodes: {
        "zh-CN": "亲属",
        "en-US": "Relative",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.family">,
  TranslationInputItem[]
>;
