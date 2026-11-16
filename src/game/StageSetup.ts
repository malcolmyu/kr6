import type {GameSession} from './GameSession'
import type {GameMode} from './types'

/** Initial state from level01.load and controller_tower_knights_tutorial.insert.
 * The first campaign's tutorial grants this tower without deducting starting gold.
 */
export function applyStageSetup(session:GameSession,stage:number,mode:GameMode,firstCampaignComplete=false,stageComplete=false,restarted=false,onboarding:{stage1?:true;stage2?:true}={}) {
  session.heroes.stage=stage;session.heroes.mode=mode==='campaign'?1:3
  session.configureStage(stage,!firstCampaignComplete&&!onboarding.stage1)
  const initialize=()=>session.initializeEntities(stage,stage===1?firstCampaignComplete||!!onboarding.stage1:stageComplete,restarted,!!onboarding.stage2)
  if(stage===2 && mode==='campaign' && !stageComplete && !onboarding.stage2 && !restarted) {
    const mage=session.towers.sites.find(s=>s.tower==='tower_wizard_lvl1_stage_02')
    if(!mage)throw new Error('Missing original stage-two academy mage')
    session.heroes.onMageBullet=name=>{if(name)session.combat.bulletOverrides.set(mage.id,name);else session.combat.bulletOverrides.delete(mage.id)}
    session.heroes.startZefiraIntro(session.time)
    session.spawnCinematicEnemy('enemy_bandit',1,{x:257,y:324})
    session.spawnCinematicEnemy('enemy_blackguard',2,{x:565,y:284})
    initialize()
    return
  }
  if(stage!==1 || mode!=='campaign'){session.heroes.insertTeam(session.levelData,session.time);initialize();return}
  if(firstCampaignComplete||onboarding.stage1){session.gold+=70;session.heroes.insertTeam(session.levelData,session.time,firstCampaignComplete);initialize();return}
  const site=session.towers.sites.find(s=>s.id==='5')
  if(!site || site.tower || site.building)throw new Error('Invalid first-stage tutorial holder')
  site.tower='tower_knights_lvl1';site.spent=70;site.canBeModified=false
  session.startTutorial()
  initialize()
}
