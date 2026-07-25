import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const socialTranslations = {
  "personal.social": [
    // Tabs
    {
      application: "frontend",
      tKey: "personal.social.tab.cards",
      langCodes: {
        "zh-CN": "核心联系人卡片 (Executive Cards)",
        "en-US": "Executive Contact Cards",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.tab.graph",
      langCodes: {
        "zh-CN": "社交网络拓扑图 (ReactFlow Graph)",
        "en-US": "Social Network Topology Graph",
      },
    },

    // Contact Cards
    {
      application: "frontend",
      tKey: "personal.social.cards.title",
      langCodes: {
        "zh-CN": "核心人脉与联系人卡片 (Executive Cards)",
        "en-US": "Executive Contacts & Network Cards",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.add",
      langCodes: {
        "zh-CN": "添加联系人",
        "en-US": "Add Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此联系人吗？",
        "en-US": "Are you sure you want to delete this contact?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.dialogAddTitle",
      langCodes: {
        "zh-CN": "新增联系人",
        "en-US": "Add Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑联系人",
        "en-US": "Edit Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.intimacy",
      langCodes: {
        "zh-CN": "亲密度:",
        "en-US": "Intimacy:",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.defaultPosition",
      langCodes: {
        "zh-CN": "联系人",
        "en-US": "Contact",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formRealName",
      langCodes: {
        "zh-CN": "姓名",
        "en-US": "Name",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formRelationCircle",
      langCodes: {
        "zh-CN": "圈子分类 (Relation Circle)",
        "en-US": "Relation Circle Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formCompany",
      langCodes: {
        "zh-CN": "公司 / 机构",
        "en-US": "Company / Organization",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formPosition",
      langCodes: {
        "zh-CN": "职位 / 职务",
        "en-US": "Position / Title",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formPhone",
      langCodes: {
        "zh-CN": "手机号码",
        "en-US": "Phone Number",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formEmail",
      langCodes: {
        "zh-CN": "电子邮箱",
        "en-US": "Email Address",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formIntimacyRating",
      langCodes: {
        "zh-CN": "亲密度评级 (1~5 星):",
        "en-US": "Intimacy Rating (1~5 Stars):",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.cards.formRemark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remarks",
      },
    },

    // Relation Circles
    {
      application: "frontend",
      tKey: "personal.social.circle.close_friend",
      langCodes: {
        "zh-CN": "核心挚友",
        "en-US": "Close Friend",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.circle.colleague",
      langCodes: {
        "zh-CN": "工作同事",
        "en-US": "Colleague",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.circle.classmate",
      langCodes: {
        "zh-CN": "同学同门",
        "en-US": "Classmate / Alumnus",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.circle.business",
      langCodes: {
        "zh-CN": "商业合作",
        "en-US": "Business Partner",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.circle.other",
      langCodes: {
        "zh-CN": "其他人脉",
        "en-US": "Other Contacts",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.circle.default",
      langCodes: {
        "zh-CN": "人脉圈",
        "en-US": "Network Circle",
      },
    },

    // Relation Graph
    {
      application: "frontend",
      tKey: "personal.social.graph.title",
      langCodes: {
        "zh-CN": "社交网络拓扑图 (ReactFlow Topology Graph)",
        "en-US": "Social Network Topology Graph",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.chipSelf",
      langCodes: {
        "zh-CN": "蓝色节点: 本人",
        "en-US": "Blue: Self",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.chipFriend",
      langCodes: {
        "zh-CN": "紫色: 核心挚友",
        "en-US": "Purple: Close Friends",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.chipColleague",
      langCodes: {
        "zh-CN": "青色: 工作同事",
        "en-US": "Cyan: Colleagues",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.chipBusiness",
      langCodes: {
        "zh-CN": "橙色: 商业合作",
        "en-US": "Orange: Business Partners",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.selfNode",
      langCodes: {
        "zh-CN": "本人 (Myself)",
        "en-US": "Myself",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.defaultRelation",
      langCodes: {
        "zh-CN": "关联",
        "en-US": "Relation",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.circleFriend",
      langCodes: {
        "zh-CN": "挚友",
        "en-US": "Friend",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.circleColleague",
      langCodes: {
        "zh-CN": "同事",
        "en-US": "Colleague",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.circleClassmate",
      langCodes: {
        "zh-CN": "校友/同学",
        "en-US": "Classmate",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.circleBusiness",
      langCodes: {
        "zh-CN": "商业伙伴",
        "en-US": "Partner",
      },
    },
    {
      application: "frontend",
      tKey: "personal.social.graph.circleContact",
      langCodes: {
        "zh-CN": "联系人",
        "en-US": "Contact",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.social">,
  TranslationInputItem[]
>;
