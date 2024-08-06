export const handleMessageListUpdate = async (
  messages: any[],
  hasMore: boolean,
  props: any,
  firstRenderChat,
  liveChatRendered,
  newMsgCount,
  lastMessagesLength,
  firstNewMsgId,
  lastLinkPushSeqId,
  effects,
  liveId,
  reducers,
  userInfo,
  isMC,
  isLecture,
  changeStudentLinkStatus,
  message
) => {
  const newestMesssage = messages[messages.length - 1];
  let contentObj;
  if (
    (props.isMC || props.isLecture) &&
    !firstRenderChat.current &&
    !liveChatRendered.current
  ) {
    if (newMsgCount.current === 0) {
      lastMessagesLength.current = messages.length - 1;
      // 讨论区不显示后接收到的第一条消息，记录一下消息的seqId
      firstNewMsgId.current = newestMesssage.rawMsg.seqId;
    }
    if (newestMesssage.rawMsg.contentType <= 1000) {
      newMsgCount.current = messages.length - lastMessagesLength.current;
      props.getNewMessageCount && props.getNewMessageCount(newMsgCount.current);
    }
  }
  if (
    newestMesssage.rawMsg.contentType > 1000 &&
    lastLinkPushSeqId.current !== newestMesssage.rawMsg.seqId
  ) {
    const contentString = newestMesssage.rawMsg.content;
    try {
      contentObj = JSON.parse(contentString);
    } catch (error) {}
    switch (newestMesssage.rawMsg.contentType) {
      case 1003:
        // 有新增置顶消息，则会新增一条消息类型为1003的消息，此时需要重新请求置顶消息list
        effects.fetchTopMessages(liveId);
        break;
      case 1001:
        // 全员禁言
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "ChatForbidden",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        reducers.setValue("forbidAll", true);
        break;
      case 1002:
        // 取消全员禁言
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "ChatUnforbidden",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        reducers.setValue("forbidAll", false);
        break;
      case 1004:
        // 直播开始
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "LiveStart",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {},
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1005:
        // 直播结束
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "LiveFinished",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {},
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1006:
        // 单人禁言
        if (contentObj?.forbiddenUserId === `${userInfo?.userId}`) {
          reducers.setValue("forbidChat", true);
        }
        break;
      case 1007:
        // 取消单人禁言
        if (contentObj?.forbiddenUserId === `${userInfo?.userId}`) {
          reducers.setValue("forbidChat", false);
        }
        break;
      case 1008:
        // 踢出
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "Kickoff",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1009:
        // 直播中观看人数变更
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "MemberCountChanged",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1010:
        // 学习资料变更
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "DocumentListChanged",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1024:
        // 讲师打开/关闭直播连麦功能
        // 根据状态设置学员申请连麦的按钮是否置灰
        reducers.setValue("forbidLink", !contentObj.liveLinkStatus);
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "LinkStatusChanged",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      case 1021:
        // 讲师打开或取消与某个学员的连麦
        // 根据状态设置学员连麦状态
        if (!isMC && !isLecture) {
          changeStudentLinkStatus(contentObj?.changeUserLinkStatus === 2);
        }
        break;
      case 1022:
        // 学员退出连麦，需通知讲师端更新学员列表，并操作学员的rtc角色为普通观众
        if (!isMC && !isLecture) {
          message.info("您已退出连麦");
          reducers.setValues({
            allowStudentLink: false,
            studentMute: true,
            studentLiveLinkStatus: 0,
          });
          props.handleAllowStudentLink && props.handleAllowStudentLink(false);
        }
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "MemberCancelLink",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      // 投屏模式切换
      case 1025:
        props.getLinkPushMessage &&
          props.getLinkPushMessage({
            command: "VideoWindowChanged",
            errorCode: -1,
            errorMsg: "",
            klinPushId: "",
            payloadData: {
              ...contentObj,
            },
            seqId: `${newestMesssage.rawMsg.seqId}`,
            subBiz: "",
          });
        break;
      default:
        break;
    }
  }
  const newMessages = [...messages];
  // 仅展示发送成功的消息
  // reducers.updateMessageList(newMessages);
  reducers.setValue("allMessageList", newMessages);
  console.log("messageUpdate", messages);
};
