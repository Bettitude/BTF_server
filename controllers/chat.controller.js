import { supabase } from '../config/supabase.js';
import { ok, created, notFound, badRequest } from '../utils/response.js';

async function userCanAccessRoom(userId, room) {
  if (room.type === 'admin') return true;
  if (room.type === 'league') {
    const { data } = await supabase.from('league_members').select('user_id')
      .match({ league_id: room.league_id, user_id: userId }).maybeSingle();
    return !!data;
  }
  if (room.type === 'dm') {
    const { data } = await supabase.from('chat_room_members').select('user_id')
      .match({ room_id: room.id, user_id: userId }).maybeSingle();
    return !!data;
  }
  return false;
}

// Rooms grouped by kind: admin-created groups, one per league you're in, and your DMs
export async function listRooms(req, res) {
  const userId = req.user.id;

  const { data: adminRooms } = await supabase.from('chat_rooms').select('*').eq('type', 'admin').order('name');

  const { data: memberships } = await supabase.from('league_members').select('league_id').eq('user_id', userId);
  const leagueIds = (memberships || []).map(m => m.league_id);
  const { data: leagueRooms } = leagueIds.length
    ? await supabase.from('chat_rooms').select('*').eq('type', 'league').in('league_id', leagueIds)
    : { data: [] };

  const { data: dmLinks } = await supabase.from('chat_room_members').select('room_id').eq('user_id', userId);
  const dmRoomIds = (dmLinks || []).map(m => m.room_id);
  let dmRooms = [];
  if (dmRoomIds.length) {
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*, chat_room_members(user_id, profiles(team_name))')
      .in('id', dmRoomIds)
      .eq('type', 'dm');
    dmRooms = (rooms || []).map(r => {
      const other = (r.chat_room_members || []).find(m => m.user_id !== userId);
      return { id: r.id, type: r.type, name: other?.profiles?.team_name || 'Direct Message', otherUserId: other?.user_id };
    });
  }

  return res.json(ok({ admin: adminRooms || [], league: leagueRooms || [], dm: dmRooms }));
}

export async function listMessages(req, res) {
  const { roomId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const { data: room } = await supabase.from('chat_rooms').select('*').eq('id', roomId).maybeSingle();
  if (!room) return res.status(404).json(notFound('Chat room'));
  if (!(await userCanAccessRoom(req.user.id, room))) return res.status(403).json(badRequest('Not a member of this room'));

  const { data, error } = await supabase
    .from('chat_messages').select('*').eq('room_id', roomId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return res.json(ok((data || []).reverse()));
}

export async function sendMessage(req, res) {
  const { roomId } = req.params;
  const { content } = req.body;

  const { data: room } = await supabase.from('chat_rooms').select('*').eq('id', roomId).maybeSingle();
  if (!room) return res.status(404).json(notFound('Chat room'));
  if (!(await userCanAccessRoom(req.user.id, room))) return res.status(403).json(badRequest('Not a member of this room'));

  const { data: profile } = await supabase.from('profiles').select('team_name').eq('id', req.user.id).maybeSingle();
  const username = profile?.team_name || req.user.email?.split('@')[0] || 'user';

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, user_id: req.user.id, username, content })
    .select().single();
  if (error) throw error;
  return res.status(201).json(created(data));
}

export async function deleteMessage(req, res) {
  const { msgId } = req.params;
  const { data: msg } = await supabase.from('chat_messages').select('user_id').eq('id', msgId).maybeSingle();
  if (!msg) return res.status(404).json(notFound('Message'));
  if (msg.user_id !== req.user.id) return res.status(403).json(badRequest('Not your message'));

  const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
  if (error) throw error;
  return res.json(ok({ deleted: msgId }));
}

// Find-or-create the 1:1 room with another user, identified by their profile id
export async function startDm(req, res) {
  const userId = req.user.id;
  const { userId: otherId } = req.body;
  if (!otherId || otherId === userId) return res.status(400).json(badRequest('A different userId is required'));

  const dmKey = [userId, otherId].sort().join(':');
  const { data: existingRoom } = await supabase.from('chat_rooms').select('*').eq('dm_key', dmKey).maybeSingle();
  if (existingRoom) return res.json(ok(existingRoom));

  const { data: otherProfile } = await supabase.from('profiles').select('id, team_name').eq('id', otherId).maybeSingle();
  if (!otherProfile) return res.status(404).json(notFound('User'));

  const { data: room, error } = await supabase
    .from('chat_rooms')
    .insert({ type: 'dm', name: 'Direct Message', dm_key: dmKey })
    .select().single();
  if (error) throw error;

  await supabase.from('chat_room_members').insert([
    { room_id: room.id, user_id: userId },
    { room_id: room.id, user_id: otherId },
  ]);

  return res.status(201).json(created(room));
}
