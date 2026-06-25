import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { RichTextEditor } from '../components';
import { resourceAPI } from '../services/api';
import './AddResource.css';

const AddResource = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await resourceAPI.getCategories();
                setCategories(data);
            } catch (err) {
                console.error('Failed to load categories', err);
            }
        };
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            setError('Please enter a title');
            return;
        }

        if (!formData.category.trim()) {
            setError('Please select or enter a category');
            return;
        }

        const textOnly = formData.content.replace(/<[^>]*>/g, '').trim();
        if (!textOnly) {
            setError('Please enter the content');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = {
                title: formData.title.trim(),
                category: formData.category.trim(),
                content: formData.content.trim(),
            };

            await resourceAPI.create(data);
            navigate('/resources?submitted=true');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add resource');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-resource-page">
            <div className="page-header">
                <h1>Add Resource</h1>
                <p>Share study materials, guides, or important non-interview topics</p>
            </div>

            <form className="add-resource-form" onSubmit={handleSubmit}>
                <section className="form-section">
                    <h3>Resource Details</h3>

                    <div className="form-group">
                        <label className="form-label" htmlFor="title">Title *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            className="form-input"
                            placeholder="e.g., Dynamic Programming Cheat Sheet"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="category">Category *</label>
                        <input
                            type="text"
                            id="category"
                            name="category"
                            list="categories-list"
                            className="form-input"
                            placeholder="Select an existing category or type a new one..."
                            value={formData.category}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                        <datalist id="categories-list">
                            {categories.map((cat) => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Content</h3>

                    <div className="form-group">
                        <label className="form-label">Resource Content *</label>
                        <RichTextEditor
                            value={formData.content}
                            onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                            placeholder="Write your resource content here..."
                            minHeight="300px"
                        />
                    </div>
                </section>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                Submitting...
                            </>
                        ) : (
                            'Add Resource'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddResource;
