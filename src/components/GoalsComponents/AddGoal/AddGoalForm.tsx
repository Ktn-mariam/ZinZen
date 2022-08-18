/* eslint-disable import/no-duplicates */
import React, { ChangeEvent, useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { addGoal, createGoal, getGoal, updateGoal } from "@src/api/GoalsAPI";
import { darkModeState } from "@store";
import { colorPallete } from "@src/utils";
import { languagesFullForms } from "@translations/i18n";

import "@translations/i18n";
import "./AddGoalForm.scss";

interface AddGoalFormProps {
  goalId: number | undefined,
  setShowAddGoals: React.Dispatch<React.SetStateAction<{
    open: boolean;
    goalId: number;
  }>>,
  selectedColorIndex: number,
  parentGoalId: number | -1,
}

export const AddGoalForm: React.FC<AddGoalFormProps> = ({ goalId, setShowAddGoals, selectedColorIndex, parentGoalId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const darkModeStatus = useRecoilValue(darkModeState);
  const [error, setError] = useState("");
  const [formInputData, setFormInputData] = useState({
    inputGoal: "",
    id: "",
  });
  const [goalTitle, setGoalTitle] = useState("");
  const [goalLink, setGoalLink] = useState<{index:number, value: null | string} | null>(null);
  const [goalRepeats, setGoalRepeats] = useState<{index:number, value: "Once" | "Daily" | "Weekly" | null} | null>(null);
  const [goalDuration, setGoalDuration] = useState<{index:number, value: null | number} | null>(null);
  const [goalStart, setGoalStart] = useState<{index:number, value: null | number} | null>(null);
  const [goalDeadline, setGoalDeadline] = useState<{index:number, value: null | number} | null>(null);

  const daily = /daily/;
  const once = /once/;
  const weekly = /weekly/;

  const lang = localStorage.getItem("language")?.slice(1, -1);
  const goalLang = lang ? languagesFullForms[lang] : languagesFullForms.en;

  const lowercaseInput = formInputData.inputGoal.toLowerCase();

  function handleTiming() {
    const onlyStart = /\sstart\s@(\d{2}|\d{1})/i;
    const onlyEnd = /\sbefore\s@(\d{2}|\d{1})/i;
    const bothTimings = /\s(\d{2}|\d{1})-(\d{2}|\d{1})/i;
    const bothIndex = lowercaseInput.search(bothTimings);
    const onlyStartIndex = lowercaseInput.search(onlyStart);
    const onlyEndIndex = lowercaseInput.search(onlyEnd);
    if (bothIndex !== -1) {
      const temp = lowercaseInput.slice(bothIndex + 1).split(" ")[0].split("-");
      return { index: bothIndex, start: Number(temp[0]), end: Number(temp[1]) };
    }
    if (onlyStartIndex !== -1) {
      return { index: onlyStartIndex, start: Number(lowercaseInput.slice(onlyStartIndex + 1).split(" ")[1].split("@")[1]), end: null };
    }
    if (onlyEndIndex !== -1) {
      return { index: onlyEndIndex, start: null, end: Number(lowercaseInput.slice(onlyEndIndex + 1).split(" ")[1].split("@")[1]) };
    }
    return { index: -1, start: null, end: null };
  }
  function handleGoalRepeat() {
    if (!lowercaseInput) { setGoalRepeats(null); return -1; }
    const freqDailyIndex = lowercaseInput.lastIndexOf(lowercaseInput.match(daily));
    const freqOnceIndex = lowercaseInput.lastIndexOf(lowercaseInput.match(once));
    const freqWeeklyIndex = lowercaseInput.lastIndexOf(lowercaseInput.match(weekly));
    const tempIndex = Math.max(freqDailyIndex, freqOnceIndex, freqWeeklyIndex);
    if (tempIndex === -1) { setGoalRepeats(null); } else if (tempIndex === freqDailyIndex) setGoalRepeats({ index: tempIndex, value: "Daily" });
    else if (tempIndex === freqOnceIndex) setGoalRepeats({ index: tempIndex, value: "Once" });
    else if (tempIndex === freqWeeklyIndex) setGoalRepeats({ index: tempIndex, value: "Weekly" });
    return tempIndex - 1;
  }
  function handleGoalLink() {
    const detector = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])|(www)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/i;
    const linkIndex = formInputData.inputGoal.search(detector);
    if (linkIndex !== -1) {
      const link = formInputData.inputGoal.slice(linkIndex).split(" ")[0];
      setGoalLink({ index: linkIndex, value: link });
    } else setGoalLink(null);
    return linkIndex - 1;
  }
  function handleGoalDuration() {
    const tracker = /(1[0-9]|2[0-4]|[1-9])+h/i;
    const reverseInputArr = lowercaseInput.split(" ");
    let lastIndex = -1;
    let tmpSum = 0;
    for (let i = 0; i < reverseInputArr.length; i += 1) {
      const reverseInput = reverseInputArr[i];
      const checkGoalHr = parseInt(String(reverseInput.match(tracker)), 10);
      const parseGoal = parseInt(String(reverseInput.match(tracker)), 10) <= 24;
      const tempIndex = reverseInput.search(tracker);
      if (tempIndex !== -1 && parseGoal) {
        lastIndex += tmpSum;
        setGoalDuration({ index: lastIndex + 1, value: checkGoalHr });
      }
      tmpSum += reverseInput.length + 1;
    }
    if (lastIndex < 0) { setGoalDuration(null); }
    return lastIndex;
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const idNum = crypto.randomUUID();

    setFormInputData({
      ...formInputData,
      id: idNum,
      [e.target.name]: value,
    });
  };

  useEffect(() => {
    const durIndx = handleGoalDuration();
    const linkIndx = handleGoalLink();
    const repeatIndx = handleGoalRepeat();
    const goalTiming = handleTiming();
    setGoalStart(goalTiming.start ? { index: goalTiming.index, value: goalTiming.start } : null);
    setGoalDeadline(goalTiming.end ? { index: goalTiming.index, value: goalTiming.end } : null);

    let tmpTitleEnd = formInputData.inputGoal.length;
    if (durIndx > 0) {
      tmpTitleEnd = durIndx > tmpTitleEnd ? tmpTitleEnd : durIndx;
    }
    if (linkIndx > 0) {
      tmpTitleEnd = linkIndx > tmpTitleEnd ? tmpTitleEnd : linkIndx;
    }
    if (goalTiming.index > 0) {
      tmpTitleEnd = goalTiming.index > tmpTitleEnd ? tmpTitleEnd : goalTiming.index;
    }
    if (repeatIndx > 0) {
      tmpTitleEnd = repeatIndx > tmpTitleEnd ? tmpTitleEnd : repeatIndx;
    }
    setGoalTitle(formInputData.inputGoal.slice(0, tmpTitleEnd));
  }, [formInputData.inputGoal]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (goalTitle.length === 0) {
      setError("Enter a goal title!");
      return;
    }
    const newGoal = createGoal(
      goalTitle,
      goalRepeats?.value,
      goalDuration?.value,
      goalStart?.value ? new Date(new Date(new Date().setHours(goalStart?.value)).setMinutes(0)) : null,
      goalDeadline?.value ? new Date(new Date(new Date().setHours(goalDeadline?.value)).setMinutes(0)) : null,
      0,
      parentGoalId!,
      colorPallete[selectedColorIndex], // goalColor
      goalLang,
      goalLink?.value
    );
    const newGoalId = await addGoal(newGoal);
    if (parentGoalId) {
      const parentGoal = await getGoal(parentGoalId);
      const newSublist = parentGoal && parentGoal.sublist ? [...parentGoal.sublist, newGoalId] : [newGoalId];
      await updateGoal(parentGoalId, { sublist: newSublist });
    }
    setFormInputData({
      inputGoal: "",
      id: "",
    });
    setGoalTitle("");
    const typeOfPage = window.location.href.split("/").slice(-1)[0];
    setShowAddGoals({ open: false, id: goalId || -1 });
    if (typeOfPage === "AddGoals") { navigate("/Home/MyGoals", { replace: true }); }
  };

  const handleTagClick = (tagType: string) => {
    const idNum = crypto.randomUUID();
    let tmpString = formInputData.inputGoal;
    if (tagType === "duration") {
      const end = tmpString.slice(goalDuration?.index).split(" ")[0].length;
      tmpString = `${tmpString.slice(0, goalDuration?.index).trim()}${tmpString.slice(goalDuration?.index + end)}`;
      setGoalDuration(null);
    } else if (tagType === "repeats") {
      const end = tmpString.slice(goalRepeats?.index).split(" ")[0].length;
      tmpString = `${tmpString.slice(0, goalRepeats?.index).trim()}${tmpString.slice(goalRepeats?.index + end)}`;
      setGoalRepeats(null);
    } else if (tagType === "link") {
      const end = tmpString.slice(goalLink?.index).split(" ")[0].length;
      tmpString = `${tmpString.slice(0, goalLink?.index).trim()}${tmpString.slice(goalLink?.index + end)}`;
      setGoalLink(null);
    } else if (goalStart && goalStart.index !== -1 && goalDeadline && goalDeadline.index !== -1) {
      const end = `${goalStart.value}-${goalDeadline.value}`.length;
      if (tagType === "start") {
        tmpString = `${tmpString.slice(0, goalStart?.index).trim()} before @${goalDeadline.value} ${tmpString.slice(goalStart?.index + end + 1).trim()}`;
        setGoalStart(null);
      } else if (tagType === "deadline") {
        tmpString = `${tmpString.slice(0, goalDeadline?.index).trim()} start @${goalStart.value} ${tmpString.slice(goalDeadline?.index + end + 1).trim()}`;
        setGoalDeadline(null);
      }
    } else if (tagType === "start") {
      const end = 7 + `${goalStart.value}`.length;
      tmpString = `${tmpString.slice(0, goalStart?.index).trim()}${tmpString.slice(goalStart?.index + end + 1).trim()}`;
      setGoalStart(null);
    } else if (tagType === "deadline") {
      const end = 8 + `${goalDeadline.value}`.length;
      tmpString = `${tmpString.slice(0, goalDeadline?.index).trim()}${tmpString.slice(goalDeadline?.index + end + 1).trim()}`;
      setGoalDeadline(null);
    }
    setFormInputData({
      id: idNum,
      inputGoal: tmpString,
    });
  };
  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div>
        <input
          className={darkModeStatus ? "addtask-dark" : "addtask-light"}
          type="text"
          name="inputGoal"
          placeholder={t("addGoalPlaceholder")}
          value={formInputData.inputGoal}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={handleChange}
        />
      </div>
      <div className="tags">
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className="language"
        >
          {goalLang}
        </button>
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className={goalStart?.value ? "form-tag" : "blank"}
          onClick={() => { handleTagClick("start"); }}
        >
          {`Start ${goalStart?.value}:00`}
        </button>
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className={goalDeadline?.value ? "form-tag" : "blank"}
          onClick={() => { handleTagClick("deadline"); }}
        >
          {`Deadline ${goalDeadline?.value}:00`}
        </button>
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className={goalDuration?.value ? "form-tag" : "blank"}
          onClick={() => { handleTagClick("duration"); }}
        >
          {`${goalDuration?.value} hours`}
        </button>
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className={goalRepeats?.value ? "form-tag" : "blank"}
          onClick={() => { handleTagClick("repeats"); }}
        >
          {goalRepeats?.value}
        </button>
        <button
          type="button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
          className={goalLink?.value ? "form-tag" : "blank"}
          onClick={() => { handleTagClick("link"); }}
        >
          URL
        </button>
      </div>
      <div className={darkModeStatus ? "mygoalsbutton-dark" : "mygoalsbutton-light"}>
        <Button
          onClick={handleSubmit}
          className="addtask-button"
          style={
            darkModeStatus
              ? { backgroundColor: colorPallete[selectedColorIndex] }
              : { backgroundColor: colorPallete[selectedColorIndex] }
          }
        >
          Add Goal
        </Button>
      </div>
      <div style={{ marginLeft: "10px", marginTop: "10px", color: "red", fontWeight: "lighter" }}>{error}</div>
    </form>
  );
};