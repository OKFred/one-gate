import mailTemplateService from "./service";

// 适配器，将原有的service适配到工厂函数的要求
export const mailTemplateServiceAdapter = {
    async add(obj: any) {
        return await mailTemplateService.add(obj);
    },
    
    async get(obj: any) {
        return await mailTemplateService.get(obj);
    },
    
    async list(obj: any) {
        // 适配分页参数
        const adaptedParams = {
            ...obj,
            pageNo: obj.page || 1,
            pageSize: obj.pageSize || 20,
        };
        const result = await mailTemplateService.list(adaptedParams);
        
        // 适配返回格式
        return {
            list: result.list,
            total: result.total,
            page: result.currentPage,
            pageSize: result.pageSize,
        };
    },
    
    async update(obj: any) {
        const result = await mailTemplateService.update(obj);
        // 返回受影响的行数
        return result ? 1 : 0;
    },
    
    async delete(obj: any) {
        const result = await mailTemplateService.delete(obj);
        // 返回受影响的行数
        return result ? 1 : 0;
    },
};