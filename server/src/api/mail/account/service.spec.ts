import { describe, it, expect, vi, beforeEach } from "vitest";
import mailAccountService, { utils } from "./service";
import * as mailAccountRepository from "./repository";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    getMailAccountsByIds: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("Mail Account Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回结果", async () => {
      const mockResult = [
        {
          id: 1,
          mailAddress: "test@example.com",
          nickname: "test",
          host: "smtp.example.com",
          port: 465,
          isEnabled: true,
        },
      ];
      vi.mocked(mailAccountRepository.findPageAll).mockResolvedValue(
        mockResult
      );

      const params = { keyword: "test", isEnabled: true };
      const res = await mailAccountService.listAll.service(params);

      expect(mailAccountRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该正确进行分页计算并返回列表和统计", async () => {
      const mockList = [
        {
          id: 1,
          mailAddress: "test@example.com",
          password: "password",
          nickname: "test",
          host: "smtp.example.com",
          port: 465,
          isEnabled: true,
          creatorId: 1,
          createTimeUtc: 1234567,
        },
      ];
      vi.mocked(mailAccountRepository.findPage).mockResolvedValue({
        total: 1,
        list: mockList as any,
      });

      const params = { pageNo: 1, pageSize: 10, keyword: "test" };
      const res = await mailAccountService.list.service(params);

      expect(mailAccountRepository.findPage).toHaveBeenCalledWith({
        ...params,
        pageSize: 10,
      });
      expect(res).toEqual({
        total: 1,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("应该解密 base64 密码并保存账号，返回新账号 id", async () => {
      vi.mocked(mailAccountRepository.onInsert).mockResolvedValue(42);

      const base64Password = Buffer.from("plain_pwd").toString("base64");
      const addData = {
        mailAddress: "new@example.com",
        password: base64Password,
        nickname: "new_nick",
        host: "smtp.new.com",
        port: 587,
        isEnabled: true,
        remark: "remark",
      };

      const res = await mailAccountService.add.service(addData, {
        userId: 99,
      } as any);

      expect(mailAccountRepository.onInsert).toHaveBeenCalledWith({
        mailAddress: "new@example.com",
        password: "plain_pwd",
        nickname: "new_nick",
        host: "smtp.new.com",
        port: 587,
        isEnabled: true,
        remark: "remark",
        creatorId: 99,
      });
      expect(res).toBe(42);
    });
  });

  describe("onUpdate", () => {
    it("应该正确解密密码（如提供），更新并返回 id", async () => {
      vi.mocked(mailAccountRepository.onUpdate).mockResolvedValue({
        id: 5,
      } as any);

      const base64Password = Buffer.from("new_plain").toString("base64");
      const updateData = {
        id: 5,
        password: base64Password,
        nickname: "updated_nick",
      };

      const res = await mailAccountService.update.service(updateData, {
        userId: 100,
      } as any);

      expect(mailAccountRepository.onUpdate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          password: "new_plain",
          nickname: "updated_nick",
          updaterId: 100,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(5);
    });
  });

  describe("onDelete", () => {
    it("应该正确删除并返回 id", async () => {
      vi.mocked(mailAccountRepository.onDelete).mockResolvedValue({
        id: 8,
      } as any);

      const res = await mailAccountService.delete.service({ id: 8 }, {
        userId: 100,
      } as any);

      expect(mailAccountRepository.onDelete).toHaveBeenCalledWith(8);
      expect(res).toBe(8);
    });
  });

  describe("onGet", () => {
    it("应该正确获取账号详情", async () => {
      const mockDetail = { id: 3, mailAddress: "detail@example.com" };
      vi.mocked(mailAccountRepository.findById).mockResolvedValue(
        mockDetail as any
      );

      const res = await mailAccountService.get.service({ id: 3 });

      expect(mailAccountRepository.findById).toHaveBeenCalledWith(3);
      expect(res).toEqual(mockDetail);
    });
  });

  describe("utils.getMailAccountsByIds", () => {
    it("应该调用 repository 获取列表", async () => {
      const mockList = [{ value: 1, label: "a@a.com" }];
      vi.mocked(mailAccountRepository.getMailAccountsByIds).mockResolvedValue(
        mockList
      );

      const res = await utils.getMailAccountsByIds([1]);

      expect(mailAccountRepository.getMailAccountsByIds).toHaveBeenCalledWith([
        1,
      ]);
      expect(res).toEqual(mockList);
    });
  });
});
