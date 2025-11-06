-- Add is_special field to menu_items to mark today's specials
ALTER TABLE public.menu_items 
ADD COLUMN is_special boolean NOT NULL DEFAULT false;

-- Mark some items as today's specials
UPDATE public.menu_items 
SET is_special = true 
WHERE name IN ('Masala Dosa', 'Cold Coffee', 'Samosa');
