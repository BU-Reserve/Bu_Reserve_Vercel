-- Update room capacities: 910 = 10, 911 = 4, 912 = 10
update public.rooms set capacity = 10 where name = '910';
update public.rooms set capacity = 4 where name = '911';
update public.rooms set capacity = 10 where name = '912';
