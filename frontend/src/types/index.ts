export interface User {
  id: string
  username: string
  profilePicture: string | null
  createdAt: string
}

export interface CampaignMember {
  userId: string
  commanderName: string
  faction: string | null
  joinedAt: string
}

export interface CampaignJoinRequest {
  userId: string
  username: string
  commanderName: string
  faction: string | null
  requestedAt: string
}

export interface Milestone { name: string; points: number }

export interface Campaign {
  id: string
  name: string
  description: string | null
  theme: string | null
  createdBy: string
  createdByName: string
  members: CampaignMember[]
  pendingRequests: CampaignJoinRequest[]
  status: string
  createdAt: string
  type: string
  subType: string | null
  startingPoints: number | null
  milestones: Milestone[]
  currentPhase: number
  pointsLimit: number | null
}

export interface Player {
  id: string
  name: string
  faction: string | null
  campaignId: string | null
  userId: string | null
  createdAt: string
}

export interface Battle {
  id: string
  campaignId: string | null
  date: string
  player1Id: string
  player1Name: string
  player1Faction: string | null
  player2Id: string
  player2Name: string
  player2Faction: string | null
  scenario: string | null
  gameSize: number | null
  result: 'player1' | 'player2' | 'draw'
  player1Vp: number
  player2Vp: number
  player1Report: string | null
  player2Report: string | null
  openPoints1: number | null
  openPoints2: number | null
  images: string[]
  notes: string | null
  createdAt: string
}

export interface Character {
  id: string
  name: string
  rank: string | null
  xp: number | null
  modifiers: string | null
  notes: string | null
  magicalItems: string[]
  isCaster: boolean
  misfires: number
  miscasts: number
  perfectInvocations: number
  heroicActions: string[]
}

export interface ArmyUnit {
  id: string
  name: string
  notes: string | null
  xp?: number | null
}

export interface ArmyList {
  id: string
  campaignId: string | null
  playerId: string
  playerName: string
  playerFaction: string | null
  name: string
  content: string | null
  gameSize: number | null
  createdAt: string
  characters: Character[]
  units: ArmyUnit[]
}

export interface Narrative {
  id: string
  campaignId: string | null
  battleId: string | null
  battleDate: string | null
  player1Name: string | null
  player2Name: string | null
  title: string
  content: string
  author: string | null
  createdAt: string
}

export interface Challenge {
  id: string
  campaignId: string
  fromPlayerId: string
  fromPlayerName: string
  toPlayerId: string
  toPlayerName: string
  message: string
  status: 'open' | 'accepted' | 'declined' | 'resolved'
  createdAt: string
}

export interface UserCampaignSummary {
  id: string
  name: string
  status: string
  type: string
  membersCount: number
  createdAt: string
}

export interface ScheduledGame {
  id: string
  campaignId: string
  date: string
  player1Id: string
  player1Name: string
  player2Id: string
  player2Name: string
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface ScoreboardEntry {
  id: string
  name: string
  faction: string | null
  wins: number
  losses: number
  draws: number
  gamesPlayed: number
  points: number
  vpFor: number
  vpAgainst: number
}
