import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const JSON_EXAMPLE = `{
  "title": "Sample Questionnaire",
  "description": "Optional description",
  "language": "zh",
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

export default function CreateQuestionnaire() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t, tf } = useLanguage();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('manual'); // 'manual' or 'json'
  const [jsonInput, setJsonInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionnaireLanguage, setQuestionnaireLanguage] = useState('zh');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [questions, setQuestions] = useState([
    { text: '', type: 'text', page_number: 1, options: [] }
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadExample = () => {
    setJsonInput(JSON_EXAMPLE);
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

      return {
        title: data.title,
        description: data.description || '',
        language: data.language || 'zh',
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
        questions: preparedQuestions
      };
    }

    // Add image_url if uploaded
    submitData.image_url = imageUrl || null;

    setSubmitting(true);

    try {
      const res = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create questionnaire');
      }

      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const maxPage = Math.max(...questions.map(q => q.page_number), 1);

  return (
    <div className="container">
      <h1>{t('admin.createQuestionnaire')}</h1>

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
                <button type="button" className="btn-link" onClick={loadExample}>
                  {t('admin.loadExample')}
                </button>
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
                <label htmlFor="description">{t('admin.description')}</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
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
            {submitting ? t('admin.creating') : t('admin.create')}
          </button>
        </div>
      </form>
    </div>
  );
}
