export type Room = {
  id: string;
  name: string;
  capacity: number;
  created_at: string;
};

export type Booking = {
  id: string;
  email: string;
  room_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  room?: Room;
};

export type BookingDuration = 1 | 2;
