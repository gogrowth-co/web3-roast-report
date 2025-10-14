-- Allow users to delete their own roasts
CREATE POLICY "Users can delete their own roasts"
ON roasts FOR DELETE
USING (auth.uid() = user_id);