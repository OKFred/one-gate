import calendarSql from "@hodor/core/db/sql/personal/personal_calendar_event.sql?raw";

export const retainedCalendarEventSql = `
INSERT INTO personal_calendar_event(id,owner_user_id,request_key,title,description,url,start_time_utc,end_time_utc,time_zone,reminder_time_utc,reminder_acknowledged_time_utc,status,version,create_time_utc,update_time_utc)
VALUES ('00000000-0000-4000-8000-000000000001',7,'00000000-0000-4000-8000-000000000002','Synthetic retained event',NULL,NULL,1000,NULL,'UTC',900,NULL,'active',1,100,100);
`;
export const existingCalendarSql = calendarSql + retainedCalendarEventSql;
