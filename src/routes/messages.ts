import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { 
  users, 
  conversations, 
  conversationParticipants, 
  messages, 
  messageReads 
} from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, or, like, desc, sql, count, gte, isNull, inArray } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';
import type {
  CreateDirectConversationRequest,
  SendMessageRequest,
  CreateGroupRequest,
  AddGroupParticipantsRequest,
} from '../types/messaging.js';

const messagesRoute = new Hono<{ Variables: AuthVariables }>();

// Helper function to get unread count for a conversation
async function getUnreadCount(conversationId: number, userId: number): Promise<number> {
  const participant = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);

  if (participant.length === 0) return 0;

  const lastReadAt = participant[0].lastReadAt || participant[0].joinedAt;

  const unreadResult = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        gte(messages.createdAt, lastReadAt),
        isNull(messages.deletedAt)
      )
    );

  return Number(unreadResult[0]?.count || 0);
}

// Helper function to find or create direct conversation
async function getOrCreateDirectConversation(userId1: number, userId2: number) {
  // Find existing direct conversation between these two users
  // Get all direct conversations where userId1 is a participant
  const user1Conversations = await db
    .select({
      conversationId: conversationParticipants.conversationId,
    })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.type, 'direct'),
        eq(conversationParticipants.userId, userId1)
      )
    );

  if (user1Conversations.length > 0) {
    const conversationIds = user1Conversations.map(c => c.conversationId);
    
    // Check if any of these conversations also have userId2 as participant
    const matchingConv = await db
      .select({
        conversationId: conversationParticipants.conversationId,
      })
      .from(conversationParticipants)
      .where(
        and(
          sql`${conversationParticipants.conversationId} = ANY(${conversationIds})`,
          eq(conversationParticipants.userId, userId2)
        )
      )
      .limit(1);

    if (matchingConv.length > 0) {
      // Return existing conversation
      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, matchingConv[0].conversationId))
        .limit(1);
      return conv[0];
    }
  }

  // Create new conversation
  const newConversation = await db
    .insert(conversations)
    .values({
      type: 'direct',
      name: null,
      description: null,
      createdBy: null,
    })
    .returning();

  const conversationId = newConversation[0].id;

  // Add both users as participants
  await db.insert(conversationParticipants).values([
    { conversationId, userId: userId1 },
    { conversationId, userId: userId2 },
  ]);

  return newConversation[0];
}

// 1. Search Users
messagesRoute.get('/users/search', authMiddleware, async (c) => {
  try {
    const query = c.req.query('query');

    if (!query) {
      return c.json({ error: 'Query parameter is required' }, 400);
    }

    const searchTerm = `%${query}%`;
    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm)
        )
      )
      .limit(20);

    return c.json({ users: usersList });
  } catch (error) {
    console.error('Error searching users:', error);
    return c.json({ error: 'Failed to search users' }, 500);
  }
});

// 2. Get or Create Direct Conversation
messagesRoute.post('/conversations/direct', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as CreateDirectConversationRequest;

    if (!body.userId || body.userId === user.id) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Check if target user exists
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (targetUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const conversation = await getOrCreateDirectConversation(user.id, body.userId);

    // Get participants with user info
    const participants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        joinedAt: conversationParticipants.joinedAt,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conversation.id));

    return c.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        participants,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating/getting direct conversation:', error);
    return c.json({ error: 'Failed to create/get conversation' }, 500);
  }
});

// 3. Get User's Conversations
messagesRoute.get('/conversations', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const type = c.req.query('type') as 'direct' | 'group' | undefined;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get conversations with type filter
    const conditions: any[] = [eq(conversationParticipants.userId, user.id)];
    if (type) {
      conditions.push(eq(conversations.type, type));
    }

    const userConvs = await db
      .select({
        conversations: conversations,
        conversationParticipants: conversationParticipants,
      })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        eq(conversations.id, conversationParticipants.conversationId)
      )
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    const conversationList = await Promise.all(
      userConvs.map(async (convData: any) => {
        const conv = convData.conversations;
        const convId = conv.id;

        // Get last message
        const lastMessage = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, convId),
              isNull(messages.deletedAt)
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count
        const unreadCount = await getUnreadCount(convId, user.id);

        if (conv.type === 'direct') {
          // Get other participant
          const otherParticipant = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            })
            .from(conversationParticipants)
            .innerJoin(users, eq(conversationParticipants.userId, users.id))
            .where(
              and(
                eq(conversationParticipants.conversationId, convId),
                sql`${conversationParticipants.userId} != ${user.id}`
              )
            )
            .limit(1);

          return {
            id: conv.id,
            type: conv.type,
            otherParticipant: otherParticipant[0] || null,
            lastMessage: lastMessage[0] ? {
              id: lastMessage[0].id,
              content: lastMessage[0].content,
              senderId: lastMessage[0].senderId,
              createdAt: lastMessage[0].createdAt,
            } : undefined,
            unreadCount,
            updatedAt: conv.updatedAt,
          };
        } else {
          // Group conversation
          const participantCount = await db
            .select({ count: count() })
            .from(conversationParticipants)
            .where(eq(conversationParticipants.conversationId, convId));

          return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            description: conv.description,
            participantCount: Number(participantCount[0]?.count || 0),
            lastMessage: lastMessage[0] ? {
              id: lastMessage[0].id,
              content: lastMessage[0].content,
              senderId: lastMessage[0].senderId,
              createdAt: lastMessage[0].createdAt,
            } : undefined,
            unreadCount,
            updatedAt: conv.updatedAt,
          };
        }
      })
    );

    return c.json({ conversations: conversationList });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

// 4. Get Conversation Messages
messagesRoute.get('/conversations/:conversationId/messages', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = parseInt(c.req.param('conversationId'));
    const limit = parseInt(c.req.query('limit') || '50');
    const before = c.req.query('before') ? parseInt(c.req.query('before')!) : undefined;
    const after = c.req.query('after') ? parseInt(c.req.query('after')!) : undefined;

    if (isNaN(conversationId)) {
      return c.json({ error: 'Invalid conversation ID' }, 400);
    }

    // Verify user is a participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    // Build query conditions
    const messageConditions: any[] = [
      eq(messages.conversationId, conversationId),
      isNull(messages.deletedAt),
    ];

    if (before) {
      messageConditions.push(sql`${messages.id} < ${before}`);
    }
    if (after) {
      messageConditions.push(sql`${messages.id} > ${after}`);
    }

    const messagesList = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(and(...messageConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Reverse to get oldest first
    messagesList.reverse();

    // Get sender info for each message
    const messagesWithSenders = await Promise.all(
      messagesList.map(async (msg) => {
        const sender = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, msg.senderId))
          .limit(1);

        return {
          id: msg.id,
          conversationId: msg.conversationId,
          sender: sender[0],
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        };
      })
    );

    return c.json({
      messages: messagesWithSenders,
      hasMore: messagesList.length === limit,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// 5. Send Message
messagesRoute.post('/conversations/:conversationId/messages', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = parseInt(c.req.param('conversationId'));
    const body = await c.req.json() as SendMessageRequest;

    if (isNaN(conversationId)) {
      return c.json({ error: 'Invalid conversation ID' }, 400);
    }

    if (!body.content || body.content.trim().length === 0) {
      return c.json({ error: 'Message content is required' }, 400);
    }

    // Verify conversation exists and user is a participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    // Create message
    const newMessage = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: user.id,
        content: body.content.trim(),
        messageType: body.messageType || 'text',
        metadata: body.metadata || null,
      })
      .returning();

    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // Get sender info
    const sender = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return c.json({
      message: {
        id: newMessage[0].id,
        conversationId: newMessage[0].conversationId,
        sender,
        content: newMessage[0].content,
        messageType: newMessage[0].messageType,
        createdAt: newMessage[0].createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// 6. Mark Conversation as Read
messagesRoute.put('/conversations/:conversationId/read', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = parseInt(c.req.param('conversationId'));

    if (isNaN(conversationId)) {
      return c.json({ error: 'Invalid conversation ID' }, 400);
    }

    // Verify user is a participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    // Update last_read_at
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id)
        )
      );

    return c.json({
      message: 'Conversation marked as read',
      lastReadAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return c.json({ error: 'Failed to mark conversation as read' }, 500);
  }
});

// 7. Create Group (Admin only)
messagesRoute.post('/groups', authMiddleware, adminMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as CreateGroupRequest;

    if (!body.name || body.name.trim().length === 0) {
      return c.json({ error: 'Group name is required' }, 400);
    }

    if (!body.userIds || body.userIds.length === 0) {
      return c.json({ error: 'At least one user ID is required' }, 400);
    }

    // Verify all user IDs exist
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, body.userIds));

    if (existingUsers.length !== body.userIds.length) {
      return c.json({ error: 'One or more user IDs are invalid' }, 400);
    }

    // Create conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        type: 'group',
        name: body.name.trim(),
        description: body.description?.trim() || null,
        createdBy: user.id,
      })
      .returning();

    const conversationId = newConversation[0].id;

    // Add participants
    await db.insert(conversationParticipants).values(
      body.userIds.map(userId => ({
        conversationId,
        userId,
      }))
    );

    // Get participants with user info
    const participants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        joinedAt: conversationParticipants.joinedAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conversationId));

    return c.json({
      group: {
        id: newConversation[0].id,
        type: newConversation[0].type,
        name: newConversation[0].name,
        description: newConversation[0].description,
        createdBy: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        participants,
        createdAt: newConversation[0].createdAt,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating group:', error);
    return c.json({ error: 'Failed to create group' }, 500);
  }
});

// 8. Get Group Details
messagesRoute.get('/groups/:groupId', authMiddleware, async (c) => {
  try {
    const groupId = parseInt(c.req.param('groupId'));

    if (isNaN(groupId)) {
      return c.json({ error: 'Invalid group ID' }, 400);
    }

    const group = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, groupId),
          eq(conversations.type, 'group')
        )
      )
      .limit(1);

    if (group.length === 0) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Get creator info
    let createdByUser = null;
    if (group[0].createdBy) {
      const creator = await db
        .select()
        .from(users)
        .where(eq(users.id, group[0].createdBy!))
        .limit(1);
      if (creator.length > 0) {
        createdByUser = {
          id: creator[0].id,
          name: creator[0].name,
          email: creator[0].email,
        };
      }
    }

    // Get participants
    const participants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        joinedAt: conversationParticipants.joinedAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, groupId));

    return c.json({
      group: {
        id: group[0].id,
        name: group[0].name,
        description: group[0].description,
        createdBy: createdByUser,
        participants,
        createdAt: group[0].createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return c.json({ error: 'Failed to fetch group' }, 500);
    }
});

// 9. Add Users to Group (Admin only)
messagesRoute.post('/groups/:groupId/participants', authMiddleware, adminMiddleware, async (c) => {
  try {
    const groupId = parseInt(c.req.param('groupId'));
    const body = await c.req.json() as AddGroupParticipantsRequest;

    if (isNaN(groupId)) {
      return c.json({ error: 'Invalid group ID' }, 400);
    }

    if (!body.userIds || body.userIds.length === 0) {
      return c.json({ error: 'At least one user ID is required' }, 400);
    }

    // Verify group exists and is a group
    const group = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, groupId),
          eq(conversations.type, 'group')
        )
      )
      .limit(1);

    if (group.length === 0) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Verify all user IDs exist
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, body.userIds));

    if (existingUsers.length !== body.userIds.length) {
      return c.json({ error: 'One or more user IDs are invalid' }, 400);
    }

    // Check which users are already participants
    const existingParticipants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, groupId),
          inArray(conversationParticipants.userId, body.userIds)
        )
      );

    const existingUserIds = existingParticipants.map(p => p.userId);
    const newUserIds = body.userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return c.json({ error: 'All users are already in the group' }, 400);
    }

    // Add new participants
    await db.insert(conversationParticipants).values(
      newUserIds.map(userId => ({
        conversationId: groupId,
        userId,
      }))
    );

    // Get added users info
    const addedUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, newUserIds));

    return c.json({
      message: 'Users added successfully',
      addedUsers,
    });
  } catch (error) {
    console.error('Error adding users to group:', error);
    return c.json({ error: 'Failed to add users to group' }, 500);
  }
});

// 10. Remove Users from Group (Admin only)
messagesRoute.delete('/groups/:groupId/participants/:userId', authMiddleware, adminMiddleware, async (c) => {
  try {
    const groupId = parseInt(c.req.param('groupId'));
    const userId = parseInt(c.req.param('userId'));

    if (isNaN(groupId) || isNaN(userId)) {
      return c.json({ error: 'Invalid group ID or user ID' }, 400);
    }

    // Verify group exists
    const group = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, groupId),
          eq(conversations.type, 'group')
        )
      )
      .limit(1);

    if (group.length === 0) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Verify user is a participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, groupId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return c.json({ error: 'User is not a participant in this group' }, 404);
    }

    // Remove participant
    await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, groupId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return c.json({
      message: 'User removed from group successfully',
    });
  } catch (error) {
    console.error('Error removing user from group:', error);
    return c.json({ error: 'Failed to remove user from group' }, 500);
  }
});

// 11. Get All Groups (Admin only)
messagesRoute.get('/groups', authMiddleware, adminMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.type, 'group'));

    const total = Number(totalResult[0]?.count || 0);

    // Get groups
    const groupsList = await db
      .select()
      .from(conversations)
      .where(eq(conversations.type, 'group'))
      .orderBy(desc(conversations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get participant counts and creator info
    const groupsWithDetails = await Promise.all(
      groupsList.map(async (group) => {
        const participantCount = await db
          .select({ count: count() })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, group.id));

        let createdByUser = null;
        if (group.createdBy) {
          const creator = await db
            .select()
            .from(users)
            .where(eq(users.id, group.createdBy))
            .limit(1);
          if (creator.length > 0) {
            createdByUser = {
              id: creator[0].id,
              name: creator[0].name,
            };
          }
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          participantCount: Number(participantCount[0]?.count || 0),
          createdBy: createdByUser,
          createdAt: group.createdAt,
        };
      })
    );

    return c.json({
      groups: groupsWithDetails,
      total,
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return c.json({ error: 'Failed to fetch groups' }, 500);
  }
});

// 12. Delete Group (Admin only)
messagesRoute.delete('/groups/:groupId', authMiddleware, adminMiddleware, async (c) => {
  try {
    const groupId = parseInt(c.req.param('groupId'));

    if (isNaN(groupId)) {
      return c.json({ error: 'Invalid group ID' }, 400);
    }

    // Verify group exists
    const group = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, groupId),
          eq(conversations.type, 'group')
        )
      )
      .limit(1);

    if (group.length === 0) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Delete group (cascade will delete participants and messages)
    await db
      .delete(conversations)
      .where(eq(conversations.id, groupId));

    return c.json({
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return c.json({ error: 'Failed to delete group' }, 500);
  }
});

export default messagesRoute;

