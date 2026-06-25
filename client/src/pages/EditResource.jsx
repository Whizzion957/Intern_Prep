import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context';
import { RichTextEditor } from '../components';
import { resourceAPI } from '../services/api';
import './AddResource.css'; // Reusing AddResource styles

const EditResource = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [resourceRes, categoriesRes] = await Promise.all([
                    resourceAPI.getById(id),
                    resourceAPI.getCategories()
                ]);
                
                const resource = resourceRes.data;
                setFormData({
                    title: resource.title,
                    category: resource.category,
                    content: resource.content,
                });
                setCategories(categoriesRes.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load resource');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [id]);

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

        setSaving(true);
        setError(null);

        try {
            const data = {
                title: formData.title.trim(),
                category: formData.category.trim(),
                content: formData.content.trim(),
            };

            await resourceAPI.update(id, data);
            navigate(`/resources/${id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update resource');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="add-resource-page">
                <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="add-resource-page">
            <div className="page-header">
                <h1>Edit Resource</h1>
                <p>Update your resource information</p>
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
                    <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditResource;
