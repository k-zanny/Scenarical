## Supabaseテーブル作成ルール（2026年10月30日〜必須）

新しいテーブルを作る際は、必ず以下の3つをセットで実行する：
1. CREATE TABLE
2. GRANT（APIアクセス許可）
3. RLS + ポリシー

テンプレート：

CREATE TABLE public.your_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- columns
  created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO service_role;

ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON public.your_table
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

エラー "42501" が出たら GRANT 不足。
エラーメッセージに必要なGRANT文が表示されるのでそれを実行する。
