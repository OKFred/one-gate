import userService from "@/api/user/service";
import { tokenUtils, UserTokenData } from "@/utils/token";

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface WechatLoginData {
    code: string;
    state?: string;
}

const loginService = {
    // 普通登录
    async commonLogin(credentials: LoginCredentials): Promise<UserTokenData | null> {
        const { username, password } = credentials;
        
        // 验证用户名和密码
        const isValid = await userService.verify(username, password);
        if (!isValid) return null;
        
        // 获取用户信息
        const user = await userService.get({ username });
        if (!user || !user.isEnabled) return null;
        
        // 生成token
        const token = tokenUtils.generateToken({
            userId: user.id,
            username: user.username,
            role: user.role,
            department: user.department
        });
        
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                department: user.department,
                isEnabled: user.isEnabled
            }
        };
    },
    
    // 微信登录
    async wechatLogin(loginData: WechatLoginData): Promise<UserTokenData | null> {
        const { code, state } = loginData;
        
        // TODO: 实现微信登录逻辑
        // 1. 使用code换取access_token
        // 2. 使用access_token获取用户信息
        // 3. 根据微信用户信息查找或创建本地用户
        // 4. 生成token
        
        // 暂时返回null，需要配置微信开发者信息
        console.log("微信登录暂未实现，需要配置微信AppID和AppSecret");
        console.log("收到的参数:", { code, state });
        
        return null;
    },
    
    // 验证token
    async verifyToken(token: string) {
        return tokenUtils.verifyToken(token);
    },
    
    // 刷新token
    async refreshToken(token: string) {
        return tokenUtils.refreshToken(token);
    }
};

export default loginService;
