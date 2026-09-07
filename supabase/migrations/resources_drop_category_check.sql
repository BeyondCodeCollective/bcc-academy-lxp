-- Legacy check constraint from the pre-2026 resources table restricted
-- category to four fixed values; the current feature treats category as
-- free admin-entered text (the editor has a free-text field), so any save
-- with a custom category failed with 23514. Drop it.
alter table resources drop constraint if exists resources_category_check;
