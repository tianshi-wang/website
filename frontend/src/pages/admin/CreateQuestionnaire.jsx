import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const JSON_EXAMPLE_FORM = `{
  "title": "Sample Questionnaire",
  "description": "Optional description",
  "type": "form",
  "language": "zh",
  "ai_summary_enabled": true,
  "ai_summary_prompt": "请根据用户的回答，分析他们的性格特点和兴趣爱好，给出温暖的建议。",
  "questions": [
    {
      "text": "What is your name?",
      "type": "text",
      "page_number": 1
    },
    {
      "text": "How old are you?",
      "type": "single_choice",
      "page_number": 1,
      "options": ["Under 18", "18-25", "26-35", "36+"]
    },
    {
      "text": "Select your interests",
      "type": "multiple_choice",
      "page_number": 2,
      "options": ["Sports", "Music", "Reading", "Travel"]
    }
  ]
}`;

const JSON_EXAMPLE_CHAT = `{
  "title": "互动对话示例",
  "description": "对话式问卷示例",
  "type": "chat",
  "language": "zh",
  "narrative": "**欢迎来到这里。**\\n\\n在这段对话开始之前，请先了解：这里是一个安全的空间，你可以诚实地回答每一个问题。\\n\\n准备好了吗？",
  "ai_summary_enabled": true,
  "ai_summary_prompt": "请根据对话内容，温柔地总结用户的心理状态和情感需求，给予理解和支持。",
  "questions": [
    {
      "text": "首先，请告诉我你的名字（或者你想被怎么称呼）？",
      "type": "text"
    },
    {
      "text": "你如何形容现在的自己？",
      "type": "single_choice",
      "options": ["自信而清醒", "仍在探索", "随遇而安", "说不清楚"]
    },
    {
      "text": "是什么让你来到这里？",
      "type": "text"
    }
  ]
}`;

export default function CreateQuestionnaire() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { token } = useAuth();
  const { t, tf } = useLanguage();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('manual'); // 'manual' or 'json'
  const [jsonInput, setJsonInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionnaireLanguage, setQuestionnaireLanguage] = useState('zh');
  const [questionnaireType, setQuestionnaireType] = useState('form');
  const [narrative, setNarrative] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false);
  const [aiSummaryPrompt, setAiSummaryPrompt] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', type: 'text', page_number: 1, options: [] }
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);

  // Fetch questionnaire data when editing
  useEffect(() => {
    if (isEditMode) {
      fetchQuestionnaire();
    }
  }, [id]);

  const fetchQuestionnaire = async () => {
    try {
      const res = await fetch(`/api/questionnaires/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch questionnaire');
      const data = await res.json();
      const q = data.questionnaire;

      setTitle(q.title);
      setDescription(q.description || '');
      setQuestionnaireLanguage(q.language || 'zh');
      setQuestionnaireType(q.type || 'form');
      setNarrative(q.narrative || '');
      setImageUrl(q.image_url || '');
      setImagePreview(q.image_url || '');
      setAiSummaryEnabled(q.ai_summary_enabled === 1 || q.ai_summary_enabled === true);
      setAiSummaryPrompt(q.ai_summary_prompt || '');

      // Transform questions data
      const transformedQuestions = q.questions.map(question => ({
        text: question.text,
        type: question.type,
        page_number: question.page_number,
        options: question.options ? question.options.map(opt => ({ text: opt.text })) : []
      }));

      setQuestions(transformedQuestions.length > 0 ? transformedQuestions : [
        { text: '', type: 'text', page_number: 1, options: [] }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('errors.selectImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('errors.imageTooLarge'));
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        setImagePreview(base64);

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64 })
        });

        if (!res.ok) {
          throw new Error(t('errors.failedToUpload'));
        }

        const data = await res.json();
        setImageUrl(data.url);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { text: '', type: 'text', page_number: 1, options: [] }
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      const updated = { ...q, [field]: value };
      if (field === 'type' && value === 'text') {
        updated.options = [];
      }
      if (field === 'type' && value !== 'text' && q.options.length === 0) {
        updated.options = [{ text: '' }, { text: '' }];
      }
      return updated;
    }));
  };

  const addOption = (questionIndex) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      return { ...q, options: [...q.options, { text: '' }] };
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      return { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) };
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      return {
        ...q,
        options: q.options.map((opt, oi) =>
          oi === optionIndex ? { ...opt, text: value } : opt
        )
      };
    }));
  };

  const [jsonExampleType, setJsonExampleType] = useState('form');

  const loadExample = () => {
    setJsonInput(jsonExampleType === 'chat' ? JSON_EXAMPLE_CHAT : JSON_EXAMPLE_FORM);
  };

  const parseJsonInput = () => {
    try {
      const data = JSON.parse(jsonInput);

      if (!data.title) {
        throw new Error(t('errors.titleRequired'));
      }
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(t('errors.atLeastOneQuestion'));
      }

      // Validate and transform questions
      const transformedQuestions = data.questions.map((q, idx) => {
        if (!q.text) {
          throw new Error(tf('errors.questionTextRequired', { num: idx + 1 }));
        }

        const type = q.type || 'text';
        if (!['text', 'single_choice', 'multiple_choice'].includes(type)) {
          throw new Error(`Question ${idx + 1}: Invalid type "${type}"`);
        }

        let options = [];
        if (type !== 'text') {
          if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(tf('errors.atLeastTwoOptions', { num: idx + 1 }));
          }
          options = q.options.map(opt => ({ text: typeof opt === 'string' ? opt : opt.text }));
        }

        return {
          text: q.text,
          type,
          page_number: q.page_number || 1,
          options
        };
      });

      const type = data.type || 'form';
      if (!['form', 'chat'].includes(type)) {
        throw new Error(`Invalid type "${type}". Must be "form" or "chat".`);
      }

      return {
        title: data.title,
        description: data.description || '',
        language: data.language || 'zh',
        type,
        narrative: data.narrative || '',
        ai_summary_enabled: data.ai_summary_enabled || false,
        ai_summary_prompt: data.ai_summary_prompt || '',
        questions: transformedQuestions
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(t('errors.invalidJson'));
      }
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let submitData;

    if (mode === 'json') {
      try {
        submitData = parseJsonInput();
        // Preserve the image_url and ensure AI settings are included
        submitData.image_url = imageUrl || null;
      } catch (err) {
        setError(err.message);
        return;
      }
    } else {
      if (!title.trim()) {
        setError(t('errors.titleRequired'));
        return;
      }

      if (questions.length === 0) {
        setError(t('errors.atLeastOneQuestion'));
        return;
      }

      for (let i = 0; i < questions.length; i++) {
        if (!questions[i].text.trim()) {
          setError(tf('errors.questionTextRequired', { num: i + 1 }));
          return;
        }
        if (questions[i].type !== 'text') {
          const validOptions = questions[i].options.filter(o => o.text.trim());
          if (validOptions.length < 2) {
            setError(tf('errors.atLeastTwoOptions', { num: i + 1 }));
            return;
          }
        }
      }

      const preparedQuestions = questions.map((q, idx) => ({
        text: q.text,
        type: q.type,
        page_number: q.page_number,
        order_num: idx,
        options: q.options.filter(o => o.text.trim()).map((o, oidx) => ({
          text: o.text,
          order_num: oidx
        }))
      }));

      submitData = {
        title,
        description,
        language: questionnaireLanguage,
        type: questionnaireType,
        narrative: questionnaireType === 'chat' ? narrative : '',
        questions: preparedQuestions,
        ai_summary_enabled: aiSummaryEnabled,
        ai_summary_prompt: aiSummaryEnabled ? aiSummaryPrompt : null
      };
    }

    // Add image_url if uploaded (already added for JSON mode above)
    if (mode === 'manual') {
      submitData.image_url = imageUrl || null;
    }

    setSubmitting(true);

    try {
      const url = isEditMode ? `/api/questionnaires/${id}` : '/api/questionnaires';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} questionnaire`);
      }

      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const maxPage = Math.max(...questions.map(q => q.page_number), 1);

  if (loadingData) {
    return <div className="loading">{t('admin.loadingQuestionnaire')}</div>;
  }

  return (
    <div className="container">
      <h1>{isEditMode ? t('admin.editQuestionnaire') : t('admin.createQuestionnaire')}</h1>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          {t('admin.manualInput')}
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'json' ? 'active' : ''}`}
          onClick={() => setMode('json')}
        >
          {t('admin.jsonImport')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Cover Image - shown in both modes */}
        <div className="card">
          <div className="form-group">
            <label>{t('admin.coverImage')}</label>
            <div className="image-upload-container">
              {imagePreview || imageUrl ? (
                <div className="image-preview-wrapper">
                  <img
                    src={imagePreview || imageUrl}
                    alt="Preview"
                    className="image-preview"
                  />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={removeImage}
                  >
                    {t('admin.remove')}
                  </button>
                </div>
              ) : (
                <div
                  className="image-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <span>{t('admin.uploading')}</span>
                  ) : (
                    <>
                      <span className="upload-icon">+</span>
                      <span>{t('admin.clickToUpload')}</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {mode === 'json' ? (
          /* JSON Import Mode */
          <div className="card">
            <div className="form-group">
              <div className="json-header">
                <label>{t('admin.jsonInput')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={jsonExampleType}
                    onChange={(e) => setJsonExampleType(e.target.value)}
                    style={{ fontSize: '12px', padding: '2px 6px' }}
                  >
                    <option value="form">表单示例</option>
                    <option value="chat">对话示例</option>
                  </select>
                  <button type="button" className="btn-link" onClick={loadExample}>
                    {t('admin.loadExample')}
                  </button>
                </div>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={16}
                placeholder={t('admin.jsonPlaceholder')}
                className="json-textarea"
              />
              <small className="form-hint">{t('admin.jsonHint')}</small>
            </div>
          </div>
        ) : (
          /* Manual Input Mode */
          <>
            <div className="card">
              <div className="form-group">
                <label htmlFor="title">{t('admin.title')} *</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="language">{t('admin.language')}</label>
                <select
                  id="language"
                  value={questionnaireLanguage}
                  onChange={(e) => setQuestionnaireLanguage(e.target.value)}
                >
                  <option value="zh">{t('admin.languageChinese')}</option>
                  <option value="en">{t('admin.languageEnglish')}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="qtype">类型</label>
                <select
                  id="qtype"
                  value={questionnaireType}
                  onChange={(e) => setQuestionnaireType(e.target.value)}
                >
                  <option value="form">表单 (Form)</option>
                  <option value="chat">对话 (Chat)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aiSummaryEnabled}
                    onChange={(e) => setAiSummaryEnabled(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  启用 AI 总结 (Enable AI Summary)
                </label>
                <small className="form-hint">为回答生成 AI 总结摘要</small>
              </div>
              {aiSummaryEnabled && (
                <div className="form-group">
                  <label htmlFor="ai_summary_prompt">AI 总结提示词 (AI Summary Prompt)</label>
                  <textarea
                    id="ai_summary_prompt"
                    value={aiSummaryPrompt}
                    onChange={(e) => setAiSummaryPrompt(e.target.value)}
                    rows={5}
                    placeholder="例如：请根据用户的回答，生成一份详细的个性分析报告，包括性格特点、兴趣爱好、价值观等方面..."
                  />
                  <small className="form-hint">
                    这个提示词将与用户的问卷回答一起发送给 AI，用于生成个性化总结。AI 会看到所有问题和回答的完整历史。
                  </small>
                </div>
              )}
              {questionnaireType === 'chat' && (
                <div className="form-group">
                  <label htmlFor="narrative">叙事文本 (Narrative)</label>
                  <textarea
                    id="narrative"
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    rows={5}
                    placeholder="支持 Markdown：**加粗**，*斜体*，换行用 \n"
                  />
                  <small className="form-hint">在对话开始前显示的故事性文字，支持 Markdown 格式</small>
                </div>
              )}
            </div>

            <div className="admin-section">
              <h2>{t('admin.questions')}</h2>

              {questions.map((question, qIndex) => (
                <div key={qIndex} className="question-builder">
                  <div className="question-builder-header">
                    <strong>{t('admin.questions')} {qIndex + 1}</strong>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        {t('admin.remove')}
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>{t('admin.questionText')} *</label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                      placeholder={t('admin.enterQuestion')}
                    />
                  </div>

                  <div className="flex gap-10">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>{t('admin.type')}</label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      >
                        <option value="text">{t('admin.typeText')}</option>
                        <option value="single_choice">{t('admin.typeSingle')}</option>
                        <option value="multiple_choice">{t('admin.typeMultiple')}</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label>{t('admin.pageNumber')}</label>
                      <select
                        value={question.page_number}
                        onChange={(e) => updateQuestion(qIndex, 'page_number', parseInt(e.target.value))}
                      >
                        {[...Array(maxPage + 1)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{tf('admin.page', { num: i + 1 })}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {question.type !== 'text' && (
                    <div className="form-group">
                      <label>{t('admin.options')}</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="option-input">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`${t('admin.option')} ${oIndex + 1}`}
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              className="remove-option-btn"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-option-btn"
                        onClick={() => addOption(qIndex)}
                      >
                        {t('admin.addOption')}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button type="button" className="btn btn-secondary" onClick={addQuestion}>
                {t('admin.addQuestion')}
              </button>
            </div>
          </>
        )}

        <div className="flex gap-10 mt-20">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/admin')}
          >
            {t('admin.cancel')}
          </button>
          <button type="submit" className="btn btn-success" disabled={submitting}>
            {submitting
              ? (isEditMode ? t('admin.updating') : t('admin.creating'))
              : (isEditMode ? t('admin.update') : t('admin.create'))
            }
          </button>
        </div>
      </form>
    </div>
  );
}
