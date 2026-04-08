
-- Disable only user-defined triggers
ALTER TABLE answers DISABLE TRIGGER prevent_answer_deletion_trigger;
ALTER TABLE questions DISABLE TRIGGER prevent_question_delete_with_answers;

-- Sections (no answers) - just delete duplicates
DELETE FROM questions WHERE id IN ('a18d1307-1825-4fd8-96c2-63ddafc28b7c','998e8489-c245-4739-8599-837b00af4891','7fcb6e3a-d562-4ca4-8546-970201bfad79','e158ce66-7a87-4140-b0af-0647e3707219','cbf84069-0026-4ed0-a479-f2070a8c8da9','3364b370-3623-488e-833d-5c7f2728a18f','202bfc2f-b0fe-49c9-bc57-1563763be761');

-- Merge answers from duplicates into keepers
UPDATE answers SET question_id = 'c38dd845-4931-4174-8e1b-84936b7f0cb4' WHERE question_id = 'e4917618-f594-497e-a68c-129a6af7f8f5';
UPDATE answers SET question_id = '81af09a6-fd17-487a-a3c2-352a3fdf7e05' WHERE question_id = 'd5aa57f7-ef10-4ce2-a873-b98bfb4bb252';
UPDATE answers SET question_id = 'a372712e-6596-44ed-bf58-8605a9a34c54' WHERE question_id = '0b8d1ae3-a3d7-45f7-b925-beec8d198aff';
UPDATE answers SET question_id = '382bff08-d2d5-4e0e-9996-0c9f0d74d44b' WHERE question_id = '2b9319b1-a34d-4563-983f-912131e7e593';
UPDATE answers SET question_id = 'c1a5108d-66a9-45b4-834c-877ea41a7510' WHERE question_id = '6f82d3d9-c554-4f49-947b-338c411a73ec';
UPDATE answers SET question_id = 'e2ed1da8-475a-4869-aa85-58110537f5cd' WHERE question_id = '41272bcb-b6d4-4a90-a309-cab7a4d747bd';
UPDATE answers SET question_id = '78c28ad4-9e28-475b-8e12-4cd0d5755403' WHERE question_id = '4ff2d7dc-89b7-4d38-8edc-d523edbdd74f';
UPDATE answers SET question_id = 'd0dcb187-81d1-424e-b57b-6bd79c608681' WHERE question_id = 'bd393e8a-e9e0-4184-88ef-bc22ca1da563';
UPDATE answers SET question_id = 'cd31aa11-59c5-4c52-ae0c-071a1a6af43a' WHERE question_id = '9300a7a1-dcd5-425c-bc91-e5f11c1b669b';
UPDATE answers SET question_id = 'cacbf4bb-942f-4abe-9ab7-69f9b69ea7d4' WHERE question_id = '695a97a2-3a9d-429e-805b-434a721ae1f2';
UPDATE answers SET question_id = '00c8b935-9000-41b2-a7c6-c30c60f85f01' WHERE question_id = '23fa3a91-052b-4ce1-ba93-83f842fa4893';
UPDATE answers SET question_id = '926e71c0-4da3-4d08-98e1-e44cd588362a' WHERE question_id = '55e0c593-6a4f-4694-a9fb-6f4b637884fd';
UPDATE answers SET question_id = 'be57858c-29d5-4ed5-8fbe-57d385c957e6' WHERE question_id = '4f0dd309-3b68-497b-aa2b-d3c1cac3a22e';
UPDATE answers SET question_id = 'fb5a8969-9f6c-4a9f-8dd5-ad003f5b1f72' WHERE question_id = '3c0f433f-db00-43b1-a8b3-317a270c139e';
UPDATE answers SET question_id = '6e1b10a6-a354-42ca-b57f-2068a27c23c6' WHERE question_id = 'ecb5d069-ee55-45db-a28d-c40d16d0a2a3';
UPDATE answers SET question_id = 'a181e39b-8737-4932-9c99-d84b32fd77d1' WHERE question_id = '6129b8c4-b1fa-4a1f-b707-8dcb2086395e';
UPDATE answers SET question_id = '175ef4d5-2358-470e-a39c-39df271097f5' WHERE question_id = '3e56beb4-47bc-4551-b45a-484559e8fc6d';
UPDATE answers SET question_id = 'dbb785b0-95bb-4d24-8a25-f9dfb9fbe18a' WHERE question_id = '370501eb-780d-435a-bd17-e48c767e0b2b';
UPDATE answers SET question_id = 'f892e7d2-7aa9-41d6-956d-d2dd28a58a8f' WHERE question_id = 'ca1becd5-2a12-4b17-8cd4-c3750e48d5e2';

-- Delete now-empty duplicate questions
DELETE FROM questions WHERE id IN (
  'e4917618-f594-497e-a68c-129a6af7f8f5','d5aa57f7-ef10-4ce2-a873-b98bfb4bb252',
  '0b8d1ae3-a3d7-45f7-b925-beec8d198aff','2b9319b1-a34d-4563-983f-912131e7e593',
  '6f82d3d9-c554-4f49-947b-338c411a73ec','41272bcb-b6d4-4a90-a309-cab7a4d747bd',
  '4ff2d7dc-89b7-4d38-8edc-d523edbdd74f','bd393e8a-e9e0-4184-88ef-bc22ca1da563',
  '9300a7a1-dcd5-425c-bc91-e5f11c1b669b','695a97a2-3a9d-429e-805b-434a721ae1f2',
  '23fa3a91-052b-4ce1-ba93-83f842fa4893','55e0c593-6a4f-4694-a9fb-6f4b637884fd',
  '4f0dd309-3b68-497b-aa2b-d3c1cac3a22e','3c0f433f-db00-43b1-a8b3-317a270c139e',
  'ecb5d069-ee55-45db-a28d-c40d16d0a2a3','6129b8c4-b1fa-4a1f-b707-8dcb2086395e',
  '3e56beb4-47bc-4551-b45a-484559e8fc6d','370501eb-780d-435a-bd17-e48c767e0b2b',
  'ca1becd5-2a12-4b17-8cd4-c3750e48d5e2'
);

-- Re-enable triggers
ALTER TABLE answers ENABLE TRIGGER prevent_answer_deletion_trigger;
ALTER TABLE questions ENABLE TRIGGER prevent_question_delete_with_answers;
